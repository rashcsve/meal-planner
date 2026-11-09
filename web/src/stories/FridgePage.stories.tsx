import { useState, type ReactNode } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, spyOn, userEvent, waitFor, within } from "storybook/test";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PantryPage } from "../features/pantry/PantryPage";
import { formatExpiry } from "../shared/lib/expiry";
import { mockApi, type MockRoute } from "./mockApi";
import { expectNoCaps } from "./expectNoCaps";

const PANTRY = /\/api\/pantry$/;
const INGREDIENTS = /\/api\/ingredients$/;
const ADD = "Add to the fridge";
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

function ingredient(id: number, name: string, baseUnit: string) {
  return {
    id,
    name,
    baseUnit,
    kcalPer100g: null,
    proteinPer100g: null,
    carbsPer100g: null,
    fatPer100g: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

const ingredientsRoute: MockRoute = {
  method: "GET",
  path: INGREDIENTS,
  body: [ingredient(5, "Feta", "g"), ingredient(6, "Eggs", "pcs")],
};

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
    api = mockApi([
      parameters.pantryRoute as MockRoute,
      (parameters.ingredientsRoute as MockRoute | undefined) ?? ingredientsRoute,
      ...((parameters.extraRoutes as MockRoute[] | undefined) ?? []),
    ]);
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

    await expect(canvas.getByRole("button", { name: ADD })).toBeInTheDocument();
    await expectNoCaps(canvasElement);
  },
};

export const Loading: Story = {
  parameters: { pantryRoute: { method: "GET", path: PANTRY, body: () => new Promise(() => {}) } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("heading", { level: 1, name: "Fridge" })).toBeInTheDocument();
    await expect(canvas.getByRole("status", { name: "Loading fridge" })).toBeInTheDocument();
    await expect(canvas.queryByRole("button", { name: ADD })).not.toBeInTheDocument();
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
    await expect(canvas.queryByRole("button", { name: ADD })).not.toBeInTheDocument();
  },
};

export const Empty: Story = {
  parameters: { pantryRoute: { method: "GET", path: PANTRY, body: [] } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await canvas.findByText("Your fridge is empty.");
    await expect(canvas.getByRole("heading", { level: 1, name: "Fridge" })).toBeInTheDocument();
    await expect(canvas.queryByText(/pantry/i)).not.toBeInTheDocument();
    await expect(canvas.getByRole("button", { name: ADD })).toBeInTheDocument();
  },
};

const emptyFridge = { method: "GET", path: PANTRY, body: [] };
const postOk = { method: "POST", path: PANTRY, status: 201, body: {} };

async function pickItem(canvasElement: HTMLElement, typed: string, option: string) {
  const canvas = within(canvasElement);
  await userEvent.type(await canvas.findByRole("combobox", { name: "Item" }), typed);
  await userEvent.click(await canvas.findByRole("option", { name: option }));
}

export const AddItem: Story = {
  parameters: { pantryRoute: emptyFridge, extraRoutes: [postOk] },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const item = await canvas.findByRole("combobox", { name: "Item" });
    await userEvent.type(item, "gg");
    await canvas.findByRole("option", { name: "Eggs" });
    await expect(canvas.queryByRole("option", { name: "Feta" })).not.toBeInTheDocument();
    await userEvent.click(canvas.getByRole("option", { name: "Eggs" }));

    await expect(item).toHaveValue("Eggs");
    await expect(canvas.queryByRole("listbox")).not.toBeInTheDocument();
    await expect(canvas.getByText("pcs")).toBeInTheDocument();
    await userEvent.type(canvas.getByLabelText("Amount"), "6");
    await userEvent.type(canvas.getByLabelText("Expires"), "2026-11-20");
    await userEvent.click(canvas.getByRole("button", { name: ADD }));

    await waitFor(() => expect(api.requestsTo("POST", PANTRY)).toHaveLength(1));
    await expect(api.requestsTo("POST", PANTRY)[0].body).toEqual({
      ingredientId: 6,
      amountBase: 6,
      expiresOn: "2026-11-20",
    });
    await waitFor(() => expect(api.requestsTo("GET", PANTRY)).toHaveLength(2));
    await waitFor(() => expect(canvas.getByLabelText("Amount")).toHaveValue(null));
    await expect(item).toHaveValue("");
  },
};

export const AddWithoutExpiry: Story = {
  parameters: { pantryRoute: emptyFridge, extraRoutes: [postOk] },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await pickItem(canvasElement, "Fe", "Feta");
    await userEvent.type(canvas.getByLabelText("Amount"), "200");
    await userEvent.click(canvas.getByRole("button", { name: ADD }));

    await waitFor(() => expect(api.requestsTo("POST", PANTRY)).toHaveLength(1));
    await expect(api.requestsTo("POST", PANTRY)[0].body).toEqual({
      ingredientId: 5,
      amountBase: 200,
    });
  },
};

export const AddNeedsAmount: Story = {
  parameters: { pantryRoute: emptyFridge, extraRoutes: [postOk] },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await pickItem(canvasElement, "Fe", "Feta");
    await userEvent.click(canvas.getByRole("button", { name: ADD }));

    const alert = await canvas.findByRole("alert");
    await expect(alert).toHaveTextContent("Amount is required");
    await expect(api.requestsTo("POST", PANTRY)).toHaveLength(0);
  },
};

export const AddUnknownItem: Story = {
  parameters: { pantryRoute: emptyFridge, extraRoutes: [postOk] },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(await canvas.findByRole("combobox", { name: "Item" }), "Natural yoghurt");
    await expect(canvas.queryByRole("option")).not.toBeInTheDocument();
    await userEvent.type(canvas.getByLabelText("Amount"), "400");
    await userEvent.click(canvas.getByRole("button", { name: ADD }));

    const alert = await canvas.findByRole("alert");
    await expect(alert).toHaveTextContent("Pick an item from the list");
    await expect(api.requestsTo("POST", PANTRY)).toHaveLength(0);
  },
};

export const AddWithoutDiacritics: Story = {
  parameters: {
    pantryRoute: emptyFridge,
    ingredientsRoute: {
      method: "GET",
      path: INGREDIENTS,
      body: [ingredient(7, "Česnek", "g"), ingredient(5, "Feta", "g")],
    },
    extraRoutes: [postOk],
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const item = await canvas.findByRole("combobox", { name: "Item" });
    await userEvent.type(item, "ces");
    await canvas.findByRole("option", { name: "Česnek" });
    await expect(canvas.queryByRole("option", { name: "Feta" })).not.toBeInTheDocument();
    await userEvent.type(item, "nek");
    await userEvent.type(canvas.getByLabelText("Amount"), "200");
    await userEvent.click(canvas.getByRole("button", { name: ADD }));

    await waitFor(() => expect(api.requestsTo("POST", PANTRY)).toHaveLength(1));
    await expect(api.requestsTo("POST", PANTRY)[0].body).toEqual({
      ingredientId: 7,
      amountBase: 200,
    });
  },
};

async function expectActive(canvasElement: HTMLElement, name: string) {
  const canvas = within(canvasElement);
  const option = canvas.getByRole("option", { name });
  await expect(option).toHaveAttribute("aria-selected", "true");
  await expect(canvas.getByRole("combobox", { name: "Item" })).toHaveAttribute(
    "aria-activedescendant",
    option.id,
  );
}

export const KeyboardMovesThroughSuggestions: Story = {
  parameters: { pantryRoute: emptyFridge, extraRoutes: [postOk] },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const item = await canvas.findByRole("combobox", { name: "Item" });
    await userEvent.type(item, "e");
    await canvas.findByRole("option", { name: "Eggs" });
    await expect(item).not.toHaveAttribute("aria-activedescendant");

    await userEvent.keyboard("{ArrowDown}");
    await expectActive(canvasElement, "Feta");
    await userEvent.keyboard("{ArrowUp}");
    await expectActive(canvasElement, "Feta");
    await userEvent.keyboard("{ArrowDown}");
    await expectActive(canvasElement, "Eggs");
    await expect(canvas.getByRole("option", { name: "Feta" })).toHaveAttribute(
      "aria-selected",
      "false",
    );
    await userEvent.keyboard("{ArrowDown}");
    await expectActive(canvasElement, "Eggs");
    await userEvent.keyboard("{ArrowUp}");
    await expectActive(canvasElement, "Feta");
  },
};

export const KeyboardEnterPicks: Story = {
  parameters: { pantryRoute: emptyFridge, extraRoutes: [postOk] },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const item = await canvas.findByRole("combobox", { name: "Item" });
    await userEvent.type(item, "e");
    await canvas.findByRole("option", { name: "Eggs" });
    await userEvent.keyboard("{ArrowDown}{ArrowDown}{Enter}");

    await expect(item).toHaveValue("Eggs");
    await expect(canvas.queryByRole("listbox")).not.toBeInTheDocument();
    await expect(item).toHaveAttribute("aria-expanded", "false");
    await expect(canvas.getByText("pcs")).toBeInTheDocument();
    await expect(canvas.queryByRole("alert")).not.toBeInTheDocument();
    await expect(api.requestsTo("POST", PANTRY)).toHaveLength(0);
  },
};

export const KeyboardEscapeCloses: Story = {
  parameters: { pantryRoute: emptyFridge, extraRoutes: [postOk] },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const item = await canvas.findByRole("combobox", { name: "Item" });
    await userEvent.type(item, "Fe");
    await canvas.findByRole("option", { name: "Feta" });
    await userEvent.keyboard("{ArrowDown}{Escape}");

    await expect(canvas.queryByRole("listbox")).not.toBeInTheDocument();
    await expect(item).toHaveValue("Fe");
    await expect(item).not.toHaveAttribute("aria-activedescendant");
    await expect(item).toHaveFocus();

    await userEvent.keyboard("{ArrowDown}");
    await expectActive(canvasElement, "Feta");
  },
};

export const SuggestionsAboveTable: Story = {
  parameters: { pantryRoute: { method: "GET", path: PANTRY, body: items } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(await canvas.findByRole("combobox", { name: "Item" }), "e");
    await canvas.findByRole("option", { name: "Eggs" });

    const list = canvas.getByRole("listbox");
    const box = list.getBoundingClientRect();
    for (let y = box.top + 2; y < box.bottom - 2; y += 4) {
      const top = document.elementFromPoint(box.left + 8, y);
      await expect(list.contains(top)).toBe(true);
    }
  },
};

export const ExpiresOpensCalendar: Story = {
  parameters: { pantryRoute: emptyFridge },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const showPicker = spyOn(HTMLInputElement.prototype, "showPicker").mockImplementation(() => {});
    try {
      await userEvent.click(await canvas.findByLabelText("Expires"));
      await expect(showPicker).toHaveBeenCalledTimes(1);
    } finally {
      showPicker.mockRestore();
    }
  },
};

export const AddFails: Story = {
  parameters: {
    pantryRoute: emptyFridge,
    extraRoutes: [
      {
        method: "POST",
        path: PANTRY,
        status: 404,
        body: { error: { message: "Ingredient not found" } },
      },
    ],
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await pickItem(canvasElement, "Fe", "Feta");
    await userEvent.type(canvas.getByLabelText("Amount"), "200");
    await userEvent.click(canvas.getByRole("button", { name: ADD }));

    const alert = await canvas.findByRole("alert");
    await expect(alert).toHaveTextContent("Couldn't add to the fridge");
    await expect(alert).toHaveTextContent("Ingredient not found");
    await expect(canvas.getByLabelText("Amount")).toHaveValue(200);
  },
};

export const IngredientsFail: Story = {
  parameters: {
    pantryRoute: emptyFridge,
    ingredientsRoute: {
      method: "GET",
      path: INGREDIENTS,
      status: 500,
      body: { error: { message: "Database unavailable" } },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const alert = await canvas.findByRole("alert");
    await expect(alert).toHaveTextContent("Couldn't load items");
    await expect(alert).toHaveTextContent("Database unavailable");
  },
};

export const NoIngredients: Story = {
  parameters: {
    pantryRoute: emptyFridge,
    ingredientsRoute: { method: "GET", path: INGREDIENTS, body: [] },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await canvas.findByText("No items to pick yet. Add ingredients to a recipe first.");
  },
};
