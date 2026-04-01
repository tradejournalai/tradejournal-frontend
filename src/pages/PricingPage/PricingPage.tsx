import Styles from "./PricingPage.module.css";
import { Link } from "react-router-dom";
import PaymentButton from "../../components/PaymentButton/PaymentButton";
import { useAuth } from "../../hooks/useAuth";
import { hasActivePro } from "../../utils/subscriptionUtils";
import { useCustomToast } from "../../hooks/useCustomToast";
import { useEffect, useState } from "react";
import PricingNav from "../../components/PricingNav/PricingNav";
import { trackEvent } from "../../utils/metaPixel";

const PricingPage = () => {
  const { user } = useAuth();
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

  /**
   * handlePaymentSuccess
   * Handles the successful response from Razorpay.
   * Uses window.location.href to solve the stale state issue by forcing a full reload.
   */
  const handlePaymentSuccess = async (
    paymentId: string,
    planType: "monthly" | "annual",
    eventId: string
  ): Promise<void> => {
    if (!user) return;

    setProcessingPlan(planType);

    const payableAmount = planType === "annual" ? annualPayable : monthlyPayable;

    // Log the successful payment ID to satisfy the linter and for debugging
    console.log(`Payment successful: ${paymentId} for ${planType}`);

    // Tracking
    trackEvent("Purchase", { value: payableAmount, currency: "INR", content_name: planType }, eventId);
    trackEvent("Subscribe", { value: payableAmount, currency: "INR", content_name: planType }, eventId);

    toast.showSuccessToast("🎉 Subscription Activated! Redirecting to Dashboard...");

    // Hard redirect is the most reliable way to ensure the RequirePro guard 
    // fetches fresh 'Pro' data from the database.
    setTimeout(() => {
      window.location.href = "/dashboard";
    }, 1500);
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
                  onSuccess={(paymentId, planType, eventId) =>
                    handlePaymentSuccess(
                      paymentId,
                      planType as "monthly" | "annual",
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
                  onSuccess={(paymentId, planType, eventId) =>
                    handlePaymentSuccess(
                      paymentId,
                      planType as "monthly" | "annual",
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