import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./app/AppShell";
import { RecipesPage } from "./features/recipes/RecipesPage";
import { PantryPage } from "./features/pantry/PantryPage";
import { WeekPage } from "./features/week/WeekPage";
import { HouseholdPage } from "./features/household/HouseholdPage";
import { Button } from "./shared/ui/Button";
import { EmptyState } from "./shared/ui/EmptyState";

function ComingSoon({ label }: { label: string }) {
  return (
    <div className="flex h-full items-center justify-center overflow-auto p-3.5">
      <EmptyState
        message={`${label} isn't built yet.`}
        action={
          <Button variant="ghost" disabled>
            Coming soon
          </Button>
        }
      />
    </div>
  );
}

function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/week" element={<WeekPage />} />
        <Route path="/shopping" element={<ComingSoon label="Shopping" />} />
        <Route path="/recipes" element={<RecipesPage />} />
        <Route path="/recipes/:id" element={<RecipesPage />} />
        <Route path="/pantry" element={<PantryPage />} />
        <Route path="/household" element={<HouseholdPage />} />
        <Route path="/import" element={<ComingSoon label="Import" />} />
        <Route path="*" element={<Navigate to="/recipes" replace />} />
      </Route>
    </Routes>
  );
}

export default App;
