import Styles from "./PricingCard.module.css";
import { Link } from "react-router-dom"; // 1. Removed useNavigate
import PaymentButton from "../../components/PaymentButton/PaymentButton";
import { useAuth } from "../../hooks/useAuth";
import { hasActivePro } from "../../utils/subscriptionUtils";
import { useCustomToast } from "../../hooks/useCustomToast";
import { useState } from "react";
// 2. Removed import type { User } since it's not used in this scope anymore

const PricingCard = () => {
  const { user } = useAuth();
  // 3. Removed const navigate = useNavigate();
  const toast = useCustomToast();
  const [processingPlan, setProcessingPlan] = useState<string | null>(null);

  const monthlyOriginal = 99;
  const annualOriginal = 799;

  const monthlyPayable = monthlyOriginal;
  const annualPayable = annualOriginal;

  /**
   * FIX: The underscore prefix on _eventId tells the linter 
   * that we know it's unused but required for the signature.
   */
  const handlePaymentSuccess = async (
    paymentId: string,
    planType: string,
  ): Promise<void> => {
    console.log("Payment successful:", paymentId, planType);
    setProcessingPlan(null);

    toast.showSuccessToast("🎉 Subscription Activated! Redirecting to Dashboard...");
    
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

    if (days > 0) {
      return `${days} day${days !== 1 ? "s" : ""}, ${hours} hour${hours !== 1 ? "s" : ""}`;
    } else {
      return `${hours} hour${hours !== 1 ? "s" : ""}`;
    }
  };

  return (
    <div className={`${Styles.pricingPageContainer}`}>
      <div id="pricing" className={Styles.pricingHero}>
        <h1 className={Styles.pageTitle}>Choose Your Plan</h1>
        <p className={Styles.pageSubtitle}>
          Select the plan that works best for your trading journey
        </p>

        <div className={Styles.pricingCards}>
          {/* Monthly Plan Card */}
          <div className={Styles.pricingCard}>
            <div className={Styles.cardHeader}>
              <h3>Premium Plan</h3>
              <p>Perfect for serious traders</p>
            </div>

            <div className={Styles.priceContainer}>
              <div className={Styles.price}>
                <span className={Styles.currency}>₹</span>
                <span className={Styles.amount}>{monthlyOriginal}</span>
                <span className={Styles.period}>/month</span>
              </div>
              <div className={Styles.effectivePrice}>Billed monthly</div>
            </div>

            <div className={Styles.trialNotice}>Start with 1 week FREE trial!</div>

            <ul className={Styles.features}>
              <li>Unlimited trades journaling.</li>
              <li>Advanced charts & graphs</li>
              <li>AI powered trades insights</li>
              <li>Psychology & Risk management analytics.</li>
              <li>Monthly performance reports</li>
              <li>Secured cloud backup</li>
              <li>Advanced analytics dashboard</li>
              <li>Standard support.</li>
            </ul>

            <div className={Styles.buttonContainer}>
              {!user ? (
                <Link to="/login">
                  <button className={Styles.ctaButton}>Login to Start Free Trial</button>
                </Link>
              ) : isSubscribed ? (
                <button className={`${Styles.ctaButton} ${Styles.activeButton}`}>
                  Currently Active
                </button>
              ) : (
                <PaymentButton
                  amount={monthlyPayable}
                  userEmail={user.email}
                  planType="monthly"
                  // FIX: Pass exactly 3 arguments to match PaymentButtonProps signature
                  onSuccess={(id, plan) => handlePaymentSuccess(id, plan)}
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
                    {isSubscribed ? (
                      <>Expires: {formatDate(user.subscription.expiresAt)}</>
                    ) : (
                      <span className={Styles.expiredText}>
                        Expired: {formatDate(user.subscription.expiresAt)}
                      </span>
                    )}
                  </p>
                )}

                {user.subscription.expiresAt && (
                  <p className={Styles.timeInfo}>
                    <strong>Time Remaining: </strong>
                    <span
                      className={
                        new Date(user.subscription.expiresAt) > new Date()
                          ? Styles.validTime
                          : Styles.expiredTime
                      }
                    >
                      {getTimeRemaining(user.subscription.expiresAt)}
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

            <div className={Styles.trialNotice}>Start with 1 week FREE trial!</div>

            <ul className={Styles.features}>
              <li>Unlimited trades journaling.</li>
              <li>Advanced charts & graphs</li>
              <li>AI powered trades insights</li>
              <li>Psychology & Risk management analytics.</li>
              <li>Monthly performance reports</li>
              <li>Advanced analytics dashboard</li>
              <li>Priority support.</li>
              <li>Early access to new features</li>
            </ul>

            <div className={Styles.buttonContainer}>
              {!user ? (
                <Link to="/login">
                  <button className={Styles.ctaButton}>Login to Start Free Trial</button>
                </Link>
              ) : isSubscribed ? (
                <button className={`${Styles.ctaButton} ${Styles.activeButton}`}>
                  Currently Active
                </button>
              ) : (
                <PaymentButton
                  amount={annualPayable}
                  userEmail={user.email}
                  planType="annual"
                  // FIX: Pass exactly 3 arguments to match PaymentButtonProps signature
                  onSuccess={(id, plan) => handlePaymentSuccess(id, plan)}
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
                    {isSubscribed ? (
                      <>Expires: {formatDate(user.subscription.expiresAt)}</>
                    ) : (
                      <span className={Styles.expiredText}>
                        Expired: {formatDate(user.subscription.expiresAt)}
                      </span>
                    )}
                  </p>
                )}

                {user.subscription.expiresAt && (
                  <p className={Styles.timeInfo}>
                    <strong>Time Remaining: </strong>
                    <span
                      className={
                        new Date(user.subscription.expiresAt) > new Date()
                          ? Styles.validTime
                          : Styles.expiredTime
                      }
                    >
                      {getTimeRemaining(user.subscription.expiresAt)}
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

export default PricingCard;