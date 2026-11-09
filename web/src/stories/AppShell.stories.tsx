import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { expect, userEvent, waitFor, within } from "storybook/test";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { AppShell } from "../app/AppShell";
import { expectNoCaps } from "./expectNoCaps";

function CurrentPath() {
  return <p>Page at {useLocation().pathname}</p>;
}

function Shell({ path }: { path: string }) {
  const [client] = useState(
    () => new QueryClient({ defaultOptions: { queries: { retry: false } } }),
  );
  return (
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route element={<AppShell />}>
            <Route path="*" element={<CurrentPath />} />
          </Route>
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

const meta: Meta<typeof Shell> = {
  title: "app/AppShell",
  component: Shell,
  args: { path: "/week" },
};

export default meta;
type Story = StoryObj<typeof Shell>;

const MENU = [
  ["Today", "/today"],
  ["Plan", "/week"],
  ["Shopping", "/shopping"],
  ["Fridge", "/pantry"],
  ["Recipes", "/recipes"],
  ["Import", "/import"],
];

export const OnPlan: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const header = canvas.getByRole("banner");
    await expect(header.getBoundingClientRect().height).toBe(56);

    const menu = within(canvas.getByRole("navigation", { name: "Main" }));
    const links = menu.getAllByRole("link");
    await expect(links.map((l) => [l.textContent, l.getAttribute("href")])).toEqual(MENU);
    await expect(menu.getByRole("link", { name: "Plan" })).toHaveAttribute("aria-current", "page");

    const household = within(header).getByRole("link", { name: "Household" });
    await expect(household).toHaveAttribute("href", "/household");
    await expect(household.getBoundingClientRect().height).toBe(44);
    await expectNoCaps(canvasElement);
  },
};

export const SwapPickerMarksPlan: Story = {
  args: { path: "/week/2026-11-02/swap/mon/dinner" },
  play: async ({ canvasElement }) => {
    const menu = within(within(canvasElement).getByRole("navigation", { name: "Main" }));
    await expect(menu.getByRole("link", { name: "Plan" })).toHaveAttribute("aria-current", "page");
  },
};

export const NumberKeysFollowMenuOrder: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const keys = [
      ["1", "/today"],
      ["4", "/pantry"],
      ["6", "/import"],
      ["7", "/household"],
      ["2", "/week"],
    ];
    for (const [key, path] of keys) {
      await userEvent.keyboard(key);
      await waitFor(() => expect(canvas.getByText(`Page at ${path}`)).toBeVisible());
    }
    await expect(canvas.getByRole("link", { name: "Household" })).not.toHaveAttribute(
      "aria-current",
    );
  },
};
