/**
 * Alert component tests.
 *
 * Verifies that the Alert component renders with correct ARIA role
 * and content. Uses React Testing Library.
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";

// Import the actual component
import { Alert, AlertDescription } from "@/components/ui/alert";

describe("Alert", () => {
  it("renders with role='alert'", () => {
    render(<Alert>Test alert</Alert>);
    const alert = screen.getByRole("alert");
    expect(alert).toBeInTheDocument();
  });

  it("renders children text", () => {
    render(<Alert>Password recovery is temporarily unavailable.</Alert>);
    expect(
      screen.getByText("Password recovery is temporarily unavailable."),
    ).toBeInTheDocument();
  });

  it("renders AlertDescription content", () => {
    render(
      <Alert>
        <AlertDescription>Something went wrong.</AlertDescription>
      </Alert>,
    );
    expect(screen.getByText("Something went wrong.")).toBeInTheDocument();
  });
});
