import { useState, type ReactNode } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within } from "storybook/test";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { Sidebar } from "../app/Sidebar";
import { mockApi } from "./mockApi";

function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(
    () => new QueryClient({ defaultOptions: { queries: { retry: false } } }),
  );
  return (
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={["/week?start=2026-11-02"]}>{children}</MemoryRouter>
    </QueryClientProvider>
  );
}

const meta: Meta<typeof Sidebar> = {
  title: "app/Sidebar",
  component: Sidebar,
  decorators: [
    (Story) => (
      <Providers>
        <Story />
      </Providers>
    ),
  ],
  beforeEach: () => {
    const api = mockApi([
      {
        method: "GET",
        path: /\/api\/household\/settings$/,
        body: { startDayOfWeek: 1, timezone: "Europe/Prague" },
      },
    ]);
    return () => api.restore();
  },
};

export default meta;
type Story = StoryObj<typeof Sidebar>;

export const OnWeek: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText("2–8 November 2026")).toBeVisible();
    await expect(canvas.getByText("Plan")).toBeVisible();
  },
};
