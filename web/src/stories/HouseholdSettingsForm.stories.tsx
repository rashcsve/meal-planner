import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, within } from "storybook/test";
import { HouseholdSettingsForm } from "../features/household/HouseholdSettingsForm";
import { expectNoCaps } from "./expectNoCaps";

const meta: Meta<typeof HouseholdSettingsForm> = {
  title: "features/household/HouseholdSettingsForm",
  component: HouseholdSettingsForm,
  args: {
    defaultValues: { weeklyBudgetCzk: 2500, startDayOfWeek: 1, timezone: "Europe/Prague" },
    onSubmit: fn(),
    isSaving: false,
  },
};

export default meta;
type Story = StoryObj<typeof HouseholdSettingsForm>;

function rulesCard(canvasElement: HTMLElement) {
  return within(within(canvasElement).getByRole("region", { name: "Rules for the week" }));
}

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const card = rulesCard(canvasElement);
    await expect(
      card.getByRole("heading", { level: 2, name: "Rules for the week" }),
    ).toBeInTheDocument();
    await expect(card.getByLabelText("Weekly budget")).toHaveValue(2500);
    await expect(card.getByText("Kč for seven dinners")).toBeInTheDocument();
    await expect(card.getByLabelText("Week starts")).toHaveValue("1");
    await expect(card.getByLabelText("Timezone")).toHaveValue("Europe/Prague");
    await expect(card.getByText("Calorie tolerance")).toBeInTheDocument();
    await expect(card.getByText("±10 %")).toBeInTheDocument();
    await expect(card.getAllByRole("button")).toHaveLength(1);
    await expect(card.getByRole("button", { name: "Save rules" })).toBeEnabled();
    await expectNoCaps(canvasElement);
  },
};

export const SavesChangedRules: Story = {
  play: async ({ canvasElement, args }) => {
    const card = rulesCard(canvasElement);
    const budget = card.getByLabelText("Weekly budget");
    await userEvent.clear(budget);
    await userEvent.type(budget, "900");
    await userEvent.selectOptions(card.getByLabelText("Week starts"), "Sunday");
    await userEvent.click(card.getByRole("button", { name: "Save rules" }));
    await expect(args.onSubmit).toHaveBeenCalledWith(
      { weeklyBudgetCzk: 900, startDayOfWeek: 0, timezone: "Europe/Prague" },
      expect.anything(),
    );
  },
};

export const NeverSaved: Story = {
  args: { defaultValues: { startDayOfWeek: 1, timezone: "Europe/Prague" } },
  play: async ({ canvasElement }) => {
    const card = rulesCard(canvasElement);
    await expect(card.getByLabelText("Weekly budget")).toHaveValue(null);
  },
};

export const Saving: Story = {
  args: { isSaving: true },
  play: async ({ canvasElement }) => {
    const card = rulesCard(canvasElement);
    await expect(card.getByRole("button", { name: "Save rules" })).toBeDisabled();
  },
};

export const SaveError: Story = {
  args: { error: "Couldn't reach the server" },
  play: async ({ canvasElement }) => {
    const card = rulesCard(canvasElement);
    const alert = card.getByRole("alert");
    await expect(alert).toHaveTextContent("Couldn't save settings");
    await expect(alert).toHaveTextContent("Couldn't reach the server");
  },
};
