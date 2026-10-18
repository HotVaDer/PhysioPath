// Runs before every test file.
// Adds readable checks like expect(button).toBeDisabled(), and clears the page after each test.
import "@testing-library/jest-dom/vitest";

import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

afterEach(cleanup);
