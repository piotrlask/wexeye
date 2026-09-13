"use client";

import { useEffect } from "react";
import { recordArticleViewAction } from "./actions";

/**
 * Renders nothing — its only job is to fire once a real browser has actually
 * mounted the article page, so the view only counts when this effect runs
 * (see recordArticleViewAction / constants.ts for why that matters).
 */
export default function ViewTracker({ articleId }: { articleId: string }) {
  useEffect(() => {
    recordArticleViewAction(articleId);
  }, [articleId]);

  return null;
}
