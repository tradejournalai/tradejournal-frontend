import React, { useState } from "react";
import styles from "./PaymentButton.module.css";
import { useAuth } from "../../hooks/useAuth";
import { trackEvent } from "../../utils/metaPixel";

interface RazorpayResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

interface OrderResponse {
  success: boolean;
  orderId: string;
  amount: number;
  currency: string;
  keyId: string;
}

interface VerifyResponse {
  success: boolean;
  message: string;
  paymentId?: string;
}

interface RazorpayCheckoutOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  handler: (response: RazorpayResponse) => void | Promise<void>;
  prefill?: { email?: string };
  theme?: { color?: string };
  modal?: { ondismiss?: () => void };
}

interface RazorpayInstance {
  open: () => void;
}

interface RazorpayConstructor {
  new (options: RazorpayCheckoutOptions): RazorpayInstance;
}

type RazorpayWindow = Window &
  typeof globalThis & {
    Razorpay?: RazorpayConstructor;
  };

interface PaymentButtonProps {
  amount: number;
  userEmail: string;
  planType: "monthly" | "annual";
  disabled?: boolean;
  onSuccess?: (
    paymentId: string,
    planType: "monthly" | "annual",
    eventId: string
  ) => void;
  onFailure?: (error: string) => void;
}

const PaymentButton: React.FC<PaymentButtonProps> = ({
  amount,
  userEmail,
  planType,
  disabled = false,
  onSuccess,
  onFailure,
}) => {
  const { user, token } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const loadRazorpayScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if ((window as RazorpayWindow).Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handlePayment = async () => {
    if (disabled || isLoading) return;

    const eventId = `purchase_${Date.now()}_${Math.random()
      .toString(36)
      .substring(2, 9)}`;

    trackEvent(
      "InitiateCheckout",
      {
        value: amount,
        currency: "INR",
        content_name: planType,
      },
      eventId
    );

    setIsLoading(true);

    try {
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) throw new Error("Failed to load Razorpay");

      const orderRes = await fetch(
        `${import.meta.env.VITE_API_URL}/payments/create-order`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            userId: user?.id,
            planType,
          }),
        }
      );

      const orderData: OrderResponse = await orderRes.json();
      if (!orderRes.ok || !orderData.success)
        throw new Error("Order creation failed");

      const Razorpay = (window as RazorpayWindow).Razorpay!;
      const rzp = new Razorpay({
        key: import.meta.env.VITE_PUBLIC_RAZORPAY_KEY_ID,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "TradeJournalAI",
        description:
          planType === "annual"
            ? "Pro Annual Subscription"
            : "Pro Monthly Subscription",
        order_id: orderData.orderId,

        handler: async (response: RazorpayResponse) => {
          const verifyRes = await fetch(
            `${import.meta.env.VITE_API_URL}/payments/verify-payment`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                ...response,
                userId: user?.id,
                planType,
                eventId,
              }),
            }
          );

          const verifyData: VerifyResponse = await verifyRes.json();

          if (verifyData.success) {
            onSuccess?.(response.razorpay_payment_id, planType, eventId);
          } else {
            onFailure?.("Payment verification failed");
          }
        },

        prefill: { email: userEmail },
        theme: { color: "#4840BB" },
      });

      rzp.open();
    } catch (err) {
      onFailure?.(
        err instanceof Error ? err.message : "Payment failed"
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      className={styles.paymentButton}
      onClick={handlePayment}
      disabled={disabled || isLoading}
    >
      {isLoading ? "Processing..." : `Subscribe for ₹${amount}`}
    </button>
  );
};

export default PaymentButton;