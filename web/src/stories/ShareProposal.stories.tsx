import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, within } from "storybook/test";
import { ShareProposal } from "../features/household/ShareProposal";
import type { HouseholdMember } from "../features/household/useHousehold";

const members: HouseholdMember[] = [
  {
    id: 1,
    name: "Svetlana",
    dailyCalorieTarget: 1500,
    dinnerCalorieTarget: 600,
    confirmedShare: null,
    shareConfirmedAt: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: 2,
    name: "Petr",
    dailyCalorieTarget: 2000,
    dinnerCalorieTarget: 800,
    confirmedShare: null,
    shareConfirmedAt: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
];

const proposal = {
  targetKcal: 800,
  shares: [
    { memberId: 1, share: 0.75 },
    { memberId: 2, share: 1 },
  ],
};

const meta: Meta<typeof ShareProposal> = {
  title: "features/household/ShareProposal",
  component: ShareProposal,
  args: {
    proposal,
    isLoading: false,
    members,
    isConfirmed: false,
    confirmedAt: null,
    onConfirm: () => {},
    isConfirming: false,
  },
};

export default meta;
type Story = StoryObj<typeof ShareProposal>;

export const Default: Story = {};

export const Confirmed: Story = {
  args: { isConfirmed: true, confirmedAt: "2026-09-20T12:00:00.000Z" },
};

export const Loading: Story = {
  args: { proposal: undefined, isLoading: true },
};

export const ProposalError: Story = {
  args: {
    proposal: undefined,
    error: "A household member has no dinner calorie target",
  },
};

export const ConfirmError: Story = {
  args: { confirmError: "Standard portion target is outside the ±10% band" },
};

export const Confirming: Story = { args: { isConfirming: true } };

export const ConfirmsProposal: Story = {
  args: { onConfirm: fn() },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Confirm" }));
    await expect(args.onConfirm).toHaveBeenCalledWith(proposal);
  },
};
