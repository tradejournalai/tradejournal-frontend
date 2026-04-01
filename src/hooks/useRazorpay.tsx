import { useState } from "react";
import { useCustomToast } from "./useCustomToast";

/**
 * Define the Subscription structure to match your Backend & PricingPage
 */
interface Subscription {
  plan: string;
  type: string;
  startedAt?: string | Date;
  expiresAt: string | Date;
}

interface PaymentResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

interface VerifyResponse {
  success: boolean;
  message?: string;
  paymentId?: string;
  subscription?: Subscription; // ✅ FIXED: Replaced 'any' with Subscription interface
}

interface OrderResponse {
  success: boolean;
  orderId: string;
  amount: number; 
  currency: string;
  keyId: string;
  planType?: string;
  message?: string;
}

interface PaymentData {
  amount: number;
  userId: string;
  userEmail: string;
  planType: "monthly" | "annual";
  // ✅ FIXED: Replaced 'any' with Subscription interface
  onSuccess?: (paymentId: string, planType: string, subscription?: Subscription) => void; 
  onFailure?: (error: string) => void;
}

/**
 * Improved global Window typing to avoid 'as any' when calling constructor
 */
declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => {
      open(): void;
    };
  }
}

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  image?: string;
  handler: (response: PaymentResponse) => void | Promise<void>;
  prefill?: {
    email?: string;
    contact?: string;
  };
  theme?: {
    color?: string;
  };
  modal?: {
    ondismiss?: () => void;
  };
}

export const useRazorpay = () => {
  const [loading, setLoading] = useState<boolean>(false);
  const toast = useCustomToast();

  const loadRazorpayScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if (window.Razorpay) {
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

  const initiatePayment = async ({
    amount,
    userId,
    userEmail,
    planType,
    onSuccess,
    onFailure,
  }: PaymentData): Promise<void> => {
    try {
      setLoading(true);

      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        toast.showErrorToast("Payment gateway failed to load.");
        onFailure?.("Payment gateway failed to load");
        return;
      }

      const token = localStorage.getItem("token");
      if (!token) {
        toast.showErrorToast("You are not logged in.");
        onFailure?.("Not authenticated");
        return;
      }

      const orderResponse = await fetch(`${import.meta.env.VITE_API_URL}/payments/create-order`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ amount, userId, planType }),
      });

      const orderData: OrderResponse = await orderResponse.json();

      if (!orderResponse.ok || !orderData.success) {
        throw new Error(orderData.message || "Failed to create order");
      }

      const options: RazorpayOptions = {
        key: import.meta.env.VITE_PUBLIC_RAZORPAY_KEY_ID as string,
        amount: orderData.amount,
        currency: orderData.currency || "INR",
        name: "TradeJournalAI",
        description: `Pro ${planType === "annual" ? "Annual" : "Monthly"} Subscription`,
        order_id: orderData.orderId,
        image: "/logo.png",

        handler: async (response: PaymentResponse) => {
          try {
            const verifyResponse = await fetch(`${import.meta.env.VITE_API_URL}/payments/verify-payment`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                userId,
                planType,
              }),
            });

            const verifyData: VerifyResponse = await verifyResponse.json();

            if (!verifyResponse.ok) {
              throw new Error(verifyData.message || "Verification request failed");
            }

            if (verifyData.success) {
              const message = `🎉 Payment successful! Welcome to Pro!`;
              toast.showSuccessToast(message);
              
              // ✅ SUCCESS: Now passing typed subscription data back
              onSuccess?.(response.razorpay_payment_id, planType, verifyData.subscription);
            } else {
              toast.showErrorToast("Payment verification failed.");
              onFailure?.(verifyData.message || "Payment verification failed");
            }
          } catch (error) {
            console.error("Payment verification error:", error);
            onFailure?.("Payment verification failed");
          }
        },

        prefill: {
          email: userEmail,
          contact: "9999999999",
        },

        theme: { color: "#4840BB" },

        modal: {
          ondismiss: () => {
            toast.showInfoToast("Payment cancelled");
            onFailure?.("Payment cancelled by user");
          },
        },
      };

      if (!window.Razorpay) {
        throw new Error("Razorpay SDK not found");
      }

      // ✅ FIXED: Using typed constructor instead of 'as any'
      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (error) {
      console.error("Payment initiation error:", error);
      onFailure?.("Failed to initiate payment");
    } finally {
      setLoading(false);
    }
  };

  return { initiatePayment, loading };
};