<?php

class GTM_Server_Side_tracking_collect_data_order
{

    private $order_id;
    private $order;

    public function __construct($order_id)
    {
        $this->order_id = $order_id;
        if (function_exists("wc_get_order")) {
            $this->order = wc_get_order($this->order_id);
        } else {
            $this->order = new stdClass();
        }
    }

    public function get_order_id()
    {
        return $this->order_id;
    }

    public function get_revenue()
    {
        if (!method_exists($this->order, "get_total")) {
            return "0";
        }
        return $this->format_number($this->order->get_total());
    }

    public function get_tax()
    {
        if (!method_exists($this->order, "get_total_tax")) {
            return "0";
        }
        return $this->format_number($this->order->get_total_tax());
    }

    public function get_shipping()
    {
        if (!method_exists($this->order, "get_shipping_total") || !method_exists($this->order, "get_shipping_tax")) {
            return "0";
        }
        $shipping_cost = $this->order->get_shipping_total() + $this->order->get_shipping_tax();
        $shipping_cost = $this->format_number($shipping_cost);
        return $shipping_cost;
    }

    public function get_product_action()
    {
        return "purchase";
    }

    public function get_coupon_code()
    {
        if (!method_exists($this->order, "get_used_coupons")) {
            return "0";
        }

        $order_coupons = $this->order->get_used_coupons();
        if (!is_array($order_coupons) || count($order_coupons) === 0) {
            return null;
        }

        $coupon_codes = "";
        foreach ($order_coupons as $coupon_name) {
            $coupon_codes .= $coupon_name . "||";
        }

        $coupon_codes = mb_substr($coupon_codes, 0, -2);
        return $coupon_codes;
    }

    public function get_order_items()
    {
        if (!method_exists($this->order, "get_items")) {
            return "0";
        }
        $orderItems = $this->order->get_items();
        $ga_order_items = array();

        $productIndex = 1;
        foreach ($orderItems as $orderItem) {
            if (!method_exists($orderItem, "get_subtotal") ||
                !method_exists($orderItem, "get_subtotal_tax") ||
                !method_exists($orderItem, "get_product_id") ||
                !method_exists($orderItem, "get_name") ||
                !method_exists($orderItem, "get_quantity") ||
                !function_exists("wc_get_product_category_list") ||
                !function_exists("wc_get_product_tag_list") ||
                !method_exists($orderItem, "get_variation_id")
            ) {
                break;
            }
            $productPriceWithTaxes = $orderItem->get_subtotal() + $orderItem->get_subtotal_tax();
            $productPriceWithTaxes = $this->format_number($productPriceWithTaxes);

            $ga_order_items[$productIndex]["id"] = $orderItem->get_product_id();
            $ga_order_items[$productIndex]["name"] = $orderItem->get_name();
            $ga_order_items[$productIndex]["qty"] = $orderItem->get_quantity();
            $ga_order_items[$productIndex]["productPriceWithTaxes"] = $productPriceWithTaxes;
            $ga_order_items[$productIndex]["variation_id"] = $orderItem->get_variation_id();
            $ga_order_items[$productIndex]["categories"] = strip_tags(wc_get_product_category_list($orderItem->get_product_id()));
            $ga_order_items[$productIndex]["tags"] = strip_tags(wc_get_product_tag_list($orderItem->get_product_id()));
            $productIndex = $productIndex + 1;
        }
        return $ga_order_items;
    }

    private function format_number($number)
    {
        return number_format(round($number, 2), 2, ".", "");
    }
}
