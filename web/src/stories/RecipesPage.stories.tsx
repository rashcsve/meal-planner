import { useState, type ReactNode } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within } from "storybook/test";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { RecipesPage } from "../features/recipes/RecipesPage";
import { mockApi, type MockRoute } from "./mockApi";
import { expectNoCaps } from "./expectNoCaps";

const RECIPES = /\/api\/recipes$/;

function recipe(id: number, title: string, time: number, kcalPerServing: number) {
  return {
    id,
    title,
    description: null,
    meal: "dinner",
    cuisine: "czech",
    proteinSource: null,
    diet: "vegetarian",
    source: null,
    time,
    cost: 90,
    servings: 4,
    kcalPerServing,
  };
}

const recipes = [
  recipe(1, "Spinach omelette", 12, 480),
  recipe(2, "Lentil soup", 25, 520),
  recipe(3, "Potato pancakes", 40, 540),
];

let api: ReturnType<typeof mockApi>;

function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(
    () => new QueryClient({ defaultOptions: { queries: { retry: false } } }),
  );
  return (
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={["/recipes"]}>
        <Routes>
          <Route path="/recipes/:id?" element={children} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

const meta: Meta<typeof RecipesPage> = {
  title: "features/recipes/RecipesPage",
  component: RecipesPage,
  decorators: [
    (Story) => (
      <Providers>
        <Story />
      </Providers>
    ),
  ],
  beforeEach: ({ parameters }) => {
    api = mockApi([parameters.recipesRoute as MockRoute]);
    return () => api.restore();
  },
};

export default meta;
type Story = StoryObj<typeof RecipesPage>;

export const Loaded: Story = {
  parameters: { recipesRoute: { method: "GET", path: RECIPES, body: recipes } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await canvas.findByText("Spinach omelette");
    await expect(canvas.getByRole("heading", { level: 1, name: "Recipes" })).toBeInTheDocument();
    await expect(canvas.getByText("3 recipes")).toBeInTheDocument();
    await expectNoCaps(canvasElement);
  },
};

export const Loading: Story = {
  parameters: {
    recipesRoute: { method: "GET", path: RECIPES, body: () => new Promise(() => {}) },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("heading", { level: 1, name: "Recipes" })).toBeInTheDocument();
    await expect(canvas.getByRole("status", { name: "Loading recipes" })).toBeInTheDocument();
  },
};

export const LoadError: Story = {
  parameters: {
    recipesRoute: {
      method: "GET",
      path: RECIPES,
      status: 500,
      body: { error: { message: "Server down" } },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const alert = await canvas.findByRole("alert");
    await expect(alert).toHaveTextContent("Couldn't load recipes");
    await expect(canvas.getByRole("heading", { level: 1, name: "Recipes" })).toBeInTheDocument();
  },
};

export const Empty: Story = {
  parameters: { recipesRoute: { method: "GET", path: RECIPES, body: [] } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await canvas.findByText("No recipes yet.");
    await expect(canvas.getByRole("heading", { level: 1, name: "Recipes" })).toBeInTheDocument();
    await expect(canvas.queryByText(/\d+ recipes?$/)).not.toBeInTheDocument();
  },
};
