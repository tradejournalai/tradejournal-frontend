import Styles from "./PricingPage.module.css";
import { Link, useNavigate } from "react-router-dom";
import PaymentButton from "../../components/PaymentButton/PaymentButton";
import { useAuth } from "../../hooks/useAuth";
import { hasActivePro } from "../../utils/subscriptionUtils";
import { useCustomToast } from "../../hooks/useCustomToast";
import { useEffect, useState } from "react";
import PricingNav from "../../components/PricingNav/PricingNav";
import { trackEvent } from "../../utils/metaPixel";
// Import User and Subscription types from your source of truth
import type { User } from "../../types/AuthTypes"; 


const PricingPage = () => {
  const { user, updateUserData } = useAuth();
  const navigate = useNavigate();
  const toast = useCustomToast();
  const [processingPlan, setProcessingPlan] = useState<string | null>(null);

  useEffect(() => {
    trackEvent("ViewContent", {
      content_name: "Pricing Page",
    });
  }, []);

  const monthlyOriginal = 99;
  const annualOriginal = 799;

  const monthlyPayable = monthlyOriginal;
  const annualPayable = annualOriginal;

  interface SubscriptionData {
  plan: "free" | "pro" | "enterprise"; 
  type: string;
  startedAt?: string | null; // Changed from Date to string | null
  expiresAt: string;         // Changed to string
}

const handlePaymentSuccess = async (
  payment_id: string,
  plan_type: "monthly" | "annual",
  event_id: string,
  new_subscription?: SubscriptionData 
): Promise<void> => {
  if (!user) return;

  const payable_amount = plan_type === "annual" ? annualPayable : monthlyPayable;

  // Tracking
  trackEvent("Purchase", { value: payable_amount, currency: "INR", content_name: plan_type }, event_id);
  trackEvent("Subscribe", { value: payable_amount, currency: "INR", content_name: plan_type }, event_id);

  if (new_subscription) {
    /**
     * FIX: Use 'unknown' instead of 'any' to satisfy the linter.
     * We then check the type safely.
     */
    const stringifyDate = (val: unknown): string => {
      if (val instanceof Date) return val.toISOString();
      return String(val ?? "");
    };

    const updatedUser: User = {
      ...user,
      subscription: {
        plan: new_subscription.plan,
        type: new_subscription.type,
        // Ensure we return string | null for startedAt
        startedAt: new_subscription.startedAt ? stringifyDate(new_subscription.startedAt) : null,
        // Ensure we return string for expiresAt
        expiresAt: stringifyDate(new_subscription.expiresAt)
      }
    };

    // Update LocalState & Context
    updateUserData(updatedUser);

    // Redirect
    setTimeout(() => {
      navigate("/dashboard");
    }, 150);
  } else {
    // Ultimate fallback if data is missing
    window.location.href = "/dashboard";
  }
};

  const handlePaymentFailure = (error: string): void => {
    console.error("Payment failed:", error);
    toast.showErrorToast("❌ Payment failed. Please try again or contact support.");
    setProcessingPlan(null);
  };

  const isSubscribed = hasActivePro(user);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const getTimeRemaining = (expiresAt: string) => {
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diff = expiry.getTime() - now.getTime();

    if (diff <= 0) return "Expired";

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (days > 0) return `${days} day${days !== 1 ? "s" : ""}, ${hours} hour${hours !== 1 ? "s" : ""}`;
    return `${hours} hour${hours !== 1 ? "s" : ""}`;
  };

  return (
    <div className={Styles.pricingPageContainer}>
      <div className={Styles.pricingNavContainer}>
        <PricingNav />
      </div>

      <div id="pricing" className={Styles.pricingHero}>
        <div className={Styles.pricingCards}>
          {/* Monthly Plan Card */}
          <div className={Styles.pricingCard}>
            <div className={Styles.cardHeader}>
              <h3>Premium Plan</h3>
              <p>Perfect for serious traders</p>
            </div>

            <div className={Styles.price}>
              <span className={Styles.currency}>₹</span>
              <span className={Styles.amount}>{monthlyOriginal}</span>
              <span className={Styles.period}>/month</span>
            </div>

            <div className={Styles.trialNotice}>Start with 24 hours FREE trial!</div>

            <ul className={Styles.features}>
              <li>Unlimited trade journaling</li>
              <li>Advanced charts and graphs</li>
              <li>AI-powered trade insights</li>
              <li>Psychology & risk analysis</li>
              <li>Monthly performance reports</li>
              <li>Secure cloud backup</li>
              <li>Advanced analytics dashboard</li>
            </ul>

            <div className={Styles.buttonContainer}>
              {!user ? (
                <Link to="/login">
                  <button className={Styles.ctaButton}>Login to Start Free Trial</button>
                </Link>
              ) : isSubscribed ? (
                <button className={`${Styles.ctaButton} ${Styles.activeButton}`}>Currently Active</button>
              ) : (
                <PaymentButton
                  amount={monthlyPayable}
                  userEmail={user.email}
                  planType="monthly"
                  // FIX 2 & 3: Match the signature expected by PaymentButton (3 arguments)
                  onSuccess={(paymentId: string, planType: "monthly" | "annual", eventId: string) =>
                    handlePaymentSuccess(
                      paymentId,
                      planType,
                      eventId
                      // Note: subscription is omitted here because PaymentButton 
                      // target signature only expects 3 arguments.
                    )
                  }
                  onFailure={handlePaymentFailure}
                  disabled={processingPlan !== null}
                />
              )}
            </div>

            {user && (
              <div className={Styles.subscriptionInfo}>
                <p className={Styles.planInfo}>
                  Current Plan: <strong>{user.subscription.plan.toUpperCase()}</strong>
                  {user.subscription.type && ` (${user.subscription.type})`}
                </p>
                {user.subscription.expiresAt && (
                  <p className={Styles.expiryInfo}>
                    {isSubscribed ? <>Expires: {formatDate(user.subscription.expiresAt.toString())}</> : <span className={Styles.expiredText}>Expired: {formatDate(user.subscription.expiresAt.toString())}</span>}
                  </p>
                )}
                {user.subscription.expiresAt && (
                  <p className={Styles.timeInfo}>
                    <strong>Time Remaining: </strong>
                    <span className={new Date(user.subscription.expiresAt) > new Date() ? Styles.validTime : Styles.expiredTime}>
                      {getTimeRemaining(user.subscription.expiresAt.toString())}
                    </span>
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Annual Plan Card */}
          <div className={`${Styles.pricingCard} ${Styles.highlightedCard}`}>
            <div className={Styles.limitedTimeBadge}>Limited Time Offer</div>
            <div className={Styles.cardHeader}>
              <h3>Premium Plus</h3>
              <p>Best value - save over 30%</p>
            </div>

            <div className={Styles.priceContainer}>
              <div className={Styles.price}>
                <span className={Styles.currency}>₹</span>
                <span className={Styles.amount}>{annualOriginal}</span>
                <span className={Styles.period}>/ year</span>
              </div>

              <div className={Styles.discountSection}>
                <div className={Styles.originalPrice}>
                  <span className={Styles.strikethrough}>₹1,188</span>
                  <span className={Styles.saveBadge}>Save 33%</span>
                </div>
              </div>
            </div>

            <div className={Styles.trialNotice}>Start with 24 hours FREE trial!</div>

            <ul className={Styles.features}>
              <li>Unlimited trade journaling</li>
              <li>Advanced charts and graphs</li>
              <li>AI-powered trade insights</li>
              <li>Psychology & risk analysis</li>
              <li>Advanced analytics dashboard</li>
              <li>Priority customer support</li>
              <li>Early access to new features</li>
            </ul>

            <div className={Styles.buttonContainer}>
              {!user ? (
                <Link to="/login">
                  <button className={Styles.ctaButton}>Login to Start Free Trial</button>
                </Link>
              ) : isSubscribed ? (
                <button className={`${Styles.ctaButton} ${Styles.activeButton}`}>Currently Active</button>
              ) : (
                <PaymentButton
                  amount={annualPayable}
                  userEmail={user.email}
                  planType="annual"
                  // FIX 2 & 3: Corrected signature mismatch
                  onSuccess={(paymentId: string, planType: "monthly" | "annual", eventId: string) =>
                    handlePaymentSuccess(
                      paymentId,
                      planType,
                      eventId
                    )
                  }
                  onFailure={handlePaymentFailure}
                  disabled={processingPlan !== null}
                />
              )}
            </div>

            {user && (
              <div className={Styles.subscriptionInfo}>
                <p className={Styles.planInfo}>
                  Current Plan: <strong>{user.subscription.plan.toUpperCase()}</strong>
                  {user.subscription.type && ` (${user.subscription.type})`}
                </p>
                {user.subscription.expiresAt && (
                  <p className={Styles.expiryInfo}>
                    {isSubscribed ? <>Expires: {formatDate(user.subscription.expiresAt.toString())}</> : <span className={Styles.expiredText}>Expired: {formatDate(user.subscription.expiresAt.toString())}</span>}
                  </p>
                )}
                {user.subscription.expiresAt && (
                  <p className={Styles.timeInfo}>
                    <strong>Time Remaining: </strong>
                    <span className={new Date(user.subscription.expiresAt) > new Date() ? Styles.validTime : Styles.expiredTime}>
                      {getTimeRemaining(user.subscription.expiresAt.toString())}
                    </span>
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PricingPage;