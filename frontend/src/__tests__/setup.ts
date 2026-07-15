/**
 * Vitest global setup for the frontend.
 *
 * Extends Vitest expect with jest-dom matchers (toBeInTheDocument,
 * toHaveClass, etc.) so component tests can use familiar DOM assertions.
 */

import "@testing-library/jest-dom/vitest";
