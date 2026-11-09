import { useState, type ReactNode } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within } from "storybook/test";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PantryPage } from "../features/pantry/PantryPage";
import { formatExpiry } from "../shared/lib/expiry";
import { mockApi, type MockRoute } from "./mockApi";
import { expectNoCaps } from "./expectNoCaps";

const PANTRY = /\/api\/pantry$/;
const DANGER = "rgb(180, 35, 24)";
const WARNING = "rgb(181, 71, 8)";

function isoInDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function item(id: number, name: string, expiresIn: number | null) {
  return {
    id,
    ingredientId: id,
    ingredientName: name,
    amountBase: 200,
    displayAmount: 200,
    displayUnit: "g",
    expiresOn: expiresIn == null ? null : isoInDays(expiresIn),
  };
}

const items = [item(1, "Sour cream", 0), item(2, "Feta", 3), item(3, "Carrots", null)];

let api: ReturnType<typeof mockApi>;

function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(
    () => new QueryClient({ defaultOptions: { queries: { retry: false } } }),
  );
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

const meta: Meta<typeof PantryPage> = {
  title: "features/pantry/FridgePage",
  component: PantryPage,
  decorators: [
    (Story) => (
      <Providers>
        <Story />
      </Providers>
    ),
  ],
  beforeEach: ({ parameters }) => {
    api = mockApi([parameters.pantryRoute as MockRoute]);
    return () => api.restore();
  },
};

export default meta;
type Story = StoryObj<typeof PantryPage>;

export const Loaded: Story = {
  parameters: { pantryRoute: { method: "GET", path: PANTRY, body: items } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await canvas.findByText("Sour cream");
    await expect(canvas.getByRole("heading", { level: 1, name: "Fridge" })).toBeInTheDocument();
    await expect(canvas.getByText("3 items")).toBeInTheDocument();

    const bar = (name: string) => getComputedStyle(canvas.getByText(name).closest("td")!).boxShadow;
    await expect(bar("Sour cream")).toBe(`${DANGER} 3px 0px 0px 0px inset`);
    await expect(bar("Feta")).toBe(`${WARNING} 3px 0px 0px 0px inset`);
    await expect(bar("Carrots")).toBe("none");

    const expiry = (days: number) =>
      getComputedStyle(canvas.getByText(formatExpiry(isoInDays(days)))).color;
    await expect(expiry(0)).toBe(DANGER);
    await expect(expiry(3)).toBe(WARNING);

    await expectNoCaps(canvasElement);
  },
};

export const Loading: Story = {
  parameters: { pantryRoute: { method: "GET", path: PANTRY, body: () => new Promise(() => {}) } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("heading", { level: 1, name: "Fridge" })).toBeInTheDocument();
    await expect(canvas.getByRole("status", { name: "Loading fridge" })).toBeInTheDocument();
  },
};

export const LoadError: Story = {
  parameters: {
    pantryRoute: {
      method: "GET",
      path: PANTRY,
      status: 500,
      body: { error: { message: "Server down" } },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const alert = await canvas.findByRole("alert");
    await expect(alert).toHaveTextContent("Couldn't load fridge");
    await expect(canvas.getByRole("heading", { level: 1, name: "Fridge" })).toBeInTheDocument();
  },
};

export const Empty: Story = {
  parameters: { pantryRoute: { method: "GET", path: PANTRY, body: [] } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await canvas.findByText("Your fridge is empty.");
    await expect(canvas.getByRole("heading", { level: 1, name: "Fridge" })).toBeInTheDocument();
    await expect(canvas.queryByText(/pantry/i)).not.toBeInTheDocument();
  },
};
