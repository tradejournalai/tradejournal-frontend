import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { trackPageView } from "../utils/metaPixel";

const MetaPageTracker = () => {
  const location = useLocation();

  useEffect(() => {
    trackPageView();
  }, [location]);

  return null;
};

export default MetaPageTracker;