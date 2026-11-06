---------------------------- MODULE AddToCart ----------------------------
(***************************************************************************)
(* How one shopper's adds reach dataLayer as add_to_cart, from both sides: *)
(*                                                                         *)
(*   assets/js/javascript.js          pluginGtmServerSide.trackAddToCart,  *)
(*                                    flushPendingAddToCart,               *)
(*                                    _pushWithStateCartData               *)
(*   includes/class-gtm-server-side-event-addtocart.php                    *)
(*                                    woocommerce_add_to_cart, wp_footer,  *)
(*                                    drop_pushed_items, get_request_token *)
(*                                                                         *)
(* An add's token is its own id. A request reads the WooCommerce session  *)
(* when it starts and writes all of it back when it ends, as               *)
(* WC_Session_Handler does, so concurrent requests can overwrite each      *)
(* other's stash.                                                          *)
(***************************************************************************)
EXTENDS Naturals, FiniteSets

CONSTANTS
    Adds,            \* the shopper's adds; each add's token is its id
    CustomEventName, \* varGtmServerSide.is_custom_event_name = 'yes'
    MaxNavs,         \* bound on plain page navigations
    MaxBg,           \* bound on requests that only rewrite the session
    SessionsOverlap  \* FALSE: one request at a time holds the session

NoAdd   == "none"
NoToken == ""

VARIABLES
    kind,      \* kind[a]: "unclicked", or how add a was made
    pushed,    \* pushed[a]: add_to_cart events for a in dataLayer
    page,      \* the page the browser shows; 0 while a navigation loads
    nextPage,  \* id for the next page
    pending,   \* pluginGtmServerSide.pendingAddToCart on the current page
    deferred,  \* pushes held by _pushWithStateCartData on the current page
    triggers,  \* added_to_cart events still to fire on the current page
    cookie,    \* gtm_server_side_add_to_cart in the browser (TOKEN_COOKIE)
    session,   \* tokens stashed under SESSION_ITEMS_KEY
    reqs,      \* requests the server has not answered
    nextReq,   \* id for the next request
    responses, \* AJAX answers the page has not seen yet
    navs,
    bgs

vars == << kind, pushed, page, nextPage, pending, deferred, triggers, cookie,
           session, reqs, nextReq, responses, navs, bgs >>

Kinds == {"unclicked", "wcAjax", "themeAjax", "pageLoad"}

(* Request types:                                                          *)
(*   "wcAjax"    wc-ajax=add_to_cart or the Store API: is_page_load_request *)
(*               is false, so nothing is stashed                           *)
(*   "themeAjax" a theme posting form.cart to the product URL over AJAX    *)
(*   "pageAdd"   a real form.cart submit or ?add-to-cart= link             *)
(*   "nav"       any other page load                                       *)
(*   "bg"        a request that only loads and saves the session, such as  *)
(*               the Store API cart fetch or a mini-cart refresh           *)
Request(type, a, sent) ==
    [id |-> nextReq, type |-> type, add |-> a, origin |-> page,
     sent |-> sent, read |-> FALSE, snap |-> {}]

TypeOK ==
    /\ kind \in [Adds -> Kinds]
    /\ pushed \in [Adds -> Nat]
    /\ page \in Nat /\ nextPage \in Nat
    /\ pending \in Adds \cup {NoAdd}
    /\ cookie \in Adds \cup {NoToken}
    /\ session \subseteq Adds
    /\ triggers \subseteq Adds

Init ==
    /\ kind = [a \in Adds |-> "unclicked"]
    /\ pushed = [a \in Adds |-> 0]
    /\ page = 1 /\ nextPage = 2
    /\ pending = NoAdd
    /\ deferred = {}
    /\ triggers = {}
    /\ cookie = NoToken
    /\ session = {}
    /\ reqs = {} /\ nextReq = 1
    /\ responses = {}
    /\ navs = 0 /\ bgs = 0

(* _pushToDataLayer: straight into dataLayer, or, with a custom event name, *)
(* after _pushWithStateCartData's cart_state request comes back.            *)
(* deleteCookie is flushPendingAddToCart's onPushed.                        *)
Push(a, deleteCookie) ==
    IF CustomEventName
    THEN /\ deferred' = deferred \cup {[add |-> a, del |-> deleteCookie]}
         /\ UNCHANGED << pushed, cookie >>
    ELSE /\ pushed' = [pushed EXCEPT ![a] = @ + 1]
         /\ cookie' = IF deleteCookie THEN NoToken ELSE cookie
         /\ UNCHANGED deferred

(* Leaving a page drops everything its script held. *)
LeavePage ==
    /\ page' = 0
    /\ pending' = NoAdd
    /\ deferred' = {}
    /\ triggers' = {}
    /\ responses' = {}

LoadPage ==
    /\ page' = nextPage
    /\ nextPage' = nextPage + 1

Issue(r) ==
    /\ reqs' = reqs \cup {r}
    /\ nextReq' = nextReq + 1

(* wp_footer: render the stash, minus what drop_pushed_items drops, and    *)
(* unset it. own is the request's own token (request_token).               *)
Shown(stash, sent, own) == {t \in stash : t = sent \/ t = own}

-----------------------------------------------------------------------------
(* Browser *)

(* WooCommerce's AJAX handler or a Blocks button: trackAddToCart pushes at  *)
(* click time and clears pending.                                           *)
ClickWcAjax(a) ==
    /\ page # 0 /\ kind[a] = "unclicked"
    /\ kind' = [kind EXCEPT ![a] = "wcAjax"]
    /\ pending' = NoAdd
    /\ Push(a, FALSE)
    /\ Issue(Request("wcAjax", a, cookie))
    /\ UNCHANGED << page, nextPage, triggers, session, responses, navs, bgs >>

(* A form.cart a theme posts over AJAX: trackAddToCart holds the item.      *)
ClickThemeAjax(a) ==
    /\ page # 0 /\ kind[a] = "unclicked"
    /\ kind' = [kind EXCEPT ![a] = "themeAjax"]
    /\ pending' = a
    /\ Issue(Request("themeAjax", a, cookie))
    /\ UNCHANGED << pushed, page, nextPage, deferred, triggers, cookie,
                    session, responses, navs, bgs >>

(* A form.cart submit that loads a page; the held item dies with the page. *)
ClickPageLoad(a) ==
    /\ page # 0 /\ kind[a] = "unclicked"
    /\ kind' = [kind EXCEPT ![a] = "pageLoad"]
    /\ LeavePage
    /\ Issue(Request("pageAdd", a, cookie))
    /\ UNCHANGED << pushed, nextPage, cookie, session, navs, bgs >>

Navigate ==
    /\ page # 0 /\ navs < MaxNavs
    /\ navs' = navs + 1
    /\ LeavePage
    /\ Issue(Request("nav", NoAdd, cookie))
    /\ UNCHANGED << kind, pushed, nextPage, cookie, session, bgs >>

(* The page, or another tab, loads and saves the session. *)
Background ==
    /\ bgs < MaxBg
    /\ bgs' = bgs + 1
    /\ Issue(Request("bg", NoAdd, cookie))
    /\ UNCHANGED << kind, pushed, page, nextPage, pending, deferred, triggers,
                    cookie, session, responses, navs >>

(* The page sees an AJAX answer: its Set-Cookie lands, and added_to_cart    *)
(* is queued (WooCommerce triggers it; a theme may, or may never).          *)
Deliver(resp) ==
    /\ resp \in responses
    /\ responses' = responses \ {resp}
    /\ cookie' = IF resp.setCookie # NoToken THEN resp.setCookie ELSE cookie
    /\ triggers' = triggers \cup {resp.add}
    /\ UNCHANGED << kind, pushed, page, nextPage, pending, deferred, session,
                    reqs, nextReq, navs, bgs >>

(* added_to_cart -> flushPendingAddToCart. *)
FireAddedToCart(a) ==
    /\ a \in triggers
    /\ triggers' = triggers \ {a}
    /\ pending' = NoAdd
    /\ IF pending # NoAdd
       THEN Push(pending, TRUE)
       ELSE UNCHANGED << pushed, cookie, deferred >>
    /\ UNCHANGED << kind, page, nextPage, session, reqs, nextReq, responses,
                    navs, bgs >>

(* _sendStateCartDataAjax's callback: push, then onPushed. *)
FireDeferred(d) ==
    /\ d \in deferred
    /\ deferred' = deferred \ {d}
    /\ pushed' = [pushed EXCEPT ![d.add] = @ + 1]
    /\ cookie' = IF d.del THEN NoToken ELSE cookie
    /\ UNCHANGED << kind, page, nextPage, pending, triggers, session, reqs,
                    nextReq, responses, navs, bgs >>

-----------------------------------------------------------------------------
(* Server *)

(* WC_Session_Handler loads the session when the request starts. *)
StartRequest(r) ==
    /\ r \in reqs /\ ~r.read
    /\ SessionsOverlap \/ \A o \in reqs : ~o.read
    /\ reqs' = (reqs \ {r}) \cup {[r EXCEPT !.read = TRUE, !.snap = session]}
    /\ UNCHANGED << kind, pushed, page, nextPage, pending, deferred, triggers,
                    cookie, session, nextReq, responses, navs, bgs >>

Answer(r, setCookie) ==
    responses' = IF r.origin = page
                 THEN responses \cup {[add |-> r.add, setCookie |-> setCookie]}
                 ELSE responses

(* An add over WooCommerce's AJAX handler or the Store API saves the cart, *)
(* and with it the whole session as it read it.                            *)
EndWcAjax(r) ==
    /\ r.type = "wcAjax"
    /\ session' = r.snap
    /\ Answer(r, NoToken)
    /\ UNCHANGED << pushed, page, nextPage, pending, deferred, triggers,
                    cookie, nextReq >>

(* A theme's AJAX post to the product URL: stashed with a token cookie.    *)
(* Its answer is a redirect or a page whose footer nobody runs; in the     *)
(* second case wp_footer has already unset the stash.                      *)
EndThemeAjax(r) ==
    /\ r.type = "themeAjax"
    /\ \/ session' = r.snap \cup {r.add}
       \/ session' = {}
    /\ Answer(r, r.add)
    /\ UNCHANGED << pushed, page, nextPage, pending, deferred, triggers,
                    cookie, nextReq >>

(* A real add-to-cart page load. Either it renders the page itself, or     *)
(* WooCommerce redirects (cart redirect after add) and the browser loads   *)
(* the target with the new cookie.                                         *)
EndPageAdd(r) ==
    /\ r.type = "pageAdd"
    /\ \/ /\ pushed' = [a \in Adds |->
                 IF a \in Shown(r.snap \cup {r.add}, r.sent, r.add)
                 THEN pushed[a] + 1 ELSE pushed[a]]
          /\ session' = {}
          /\ cookie' = r.add
          /\ LoadPage
          /\ UNCHANGED nextReq
       \/ /\ session' = r.snap \cup {r.add}
          /\ cookie' = r.add
          /\ nextReq' = nextReq + 1
          /\ UNCHANGED << pushed, page, nextPage >>
    /\ UNCHANGED << pending, deferred, triggers, responses >>

(* A page load: wp_footer renders and unsets the stash. With nothing       *)
(* stashed the session is not dirty and is not saved.                      *)
EndNav(r) ==
    /\ r.type = "nav"
    /\ pushed' = [a \in Adds |->
           IF a \in Shown(r.snap, r.sent, NoToken)
           THEN pushed[a] + 1 ELSE pushed[a]]
    /\ session' = IF r.snap = {} THEN session ELSE {}
    /\ LoadPage
    /\ UNCHANGED << pending, deferred, triggers, cookie, nextReq, responses >>

EndBg(r) ==
    /\ r.type = "bg"
    /\ session' = r.snap
    /\ UNCHANGED << pushed, page, nextPage, pending, deferred, triggers,
                    cookie, nextReq, responses >>

EndRequest(r) ==
    /\ r \in reqs /\ r.read
    /\ \/ EndWcAjax(r) \/ EndThemeAjax(r) \/ EndPageAdd(r) \/ EndNav(r)
       \/ EndBg(r)
    \* The redirect's target, requested with the cookie the redirect set.
    /\ reqs' = (reqs \ {r}) \cup
               (IF r.type = "pageAdd" /\ page' = 0
                THEN {Request("nav", NoAdd, r.add)} ELSE {})
    /\ UNCHANGED << kind, navs, bgs >>

-----------------------------------------------------------------------------

Next ==
    \/ \E a \in Adds : ClickWcAjax(a) \/ ClickThemeAjax(a) \/ ClickPageLoad(a)
    \/ Navigate
    \/ Background
    \/ \E resp \in responses : Deliver(resp)
    \/ \E a \in triggers : FireAddedToCart(a)
    \/ \E d \in deferred : FireDeferred(d)
    \/ \E r \in reqs : StartRequest(r) \/ EndRequest(r)

Spec == Init /\ [][Next]_vars

-----------------------------------------------------------------------------
(* Properties *)

(* The promise DEV-13298 made: an add is never reported twice. *)
AtMostOnce == \A a \in Adds : pushed[a] <= 1

(* Nothing is left to happen that could still report an add. *)
Settled ==
    /\ page # 0
    /\ reqs = {} /\ responses = {} /\ triggers = {} /\ deferred = {}
    /\ pending = NoAdd
    /\ session = {}

(* Once settled, every add was reported. Known to fail: see SKILL.md. *)
AtLeastOnce ==
    Settled => \A a \in Adds : kind[a] # "unclicked" => pushed[a] >= 1

=============================================================================
