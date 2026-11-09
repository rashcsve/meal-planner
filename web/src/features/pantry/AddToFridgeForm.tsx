import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createPantryItemSchema, type CreatePantryItemInput } from "shared";
import { Button } from "../../shared/ui/Button";
import { Input } from "../../shared/ui/Input";
import { ErrorState } from "../../shared/ui/ErrorState";
import { emptyToUndefined, emptyToUndefinedNumber } from "../../shared/lib/formValues";
import { useIngredients } from "../../shared/api/useIngredients";
import { normalizeForSearch } from "../../shared/lib/normalizeText";
import { useCreatePantryItem } from "./usePantry";

export function AddToFridgeForm() {
  const ingredientsQuery = useIngredients();
  const ingredients = ingredientsQuery.data ?? [];
  const createItem = useCreatePantryItem();
  const {
    register,
    handleSubmit,
    reset,
    control,
    setValue,
    formState: { errors, isSubmitted },
  } = useForm<CreatePantryItemInput>({ resolver: zodResolver(createPantryItemSchema) });

  const ingredientId = useWatch({ control, name: "ingredientId" });
  const unit = ingredients.find((i) => i.id === ingredientId)?.baseUnit;
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const needle = normalizeForSearch(query.trim());
  const matches = needle
    ? ingredients.filter((i) => normalizeForSearch(i.name).includes(needle))
    : [];
  const showList = open && matches.length > 0;
  const [active, setActive] = useState(-1);
  const activeOption = showList ? matches[active] : undefined;
  const optionId = (id: number) => `fridge-item-option-${id}`;

  function closeList() {
    setOpen(false);
    setActive(-1);
  }

  function onItemKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown" && matches.length > 0) {
      e.preventDefault();
      setOpen(true);
      setActive((i) => Math.min(i + 1, matches.length - 1));
    } else if (e.key === "ArrowUp" && showList) {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && activeOption) {
      e.preventDefault();
      chooseText(activeOption.name);
      closeList();
    } else if (e.key === "Escape" && showList) {
      e.preventDefault();
      closeList();
    }
  }

  function chooseText(text: string) {
    setQuery(text);
    const id = ingredients.find(
      (i) => normalizeForSearch(i.name) === normalizeForSearch(text.trim()),
    )?.id;
    setValue("ingredientId", id as number, { shouldValidate: isSubmitted });
  }
  const message =
    (errors.ingredientId && "Pick an item from the list") ??
    errors.amountBase?.message ??
    errors.expiresOn?.message ??
    createItem.error?.message;
  const errorId = message ? "add-to-fridge-error" : undefined;

  function onSubmit(data: CreatePantryItemInput) {
    createItem.mutate(data, {
      onSuccess: () => {
        reset();
        setQuery("");
      },
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <form
        onSubmit={handleSubmit(onSubmit)}
        aria-describedby={errorId}
        className="flex flex-wrap items-end gap-3 rounded-card bg-fill p-3"
      >
        <div className="flex min-w-48 flex-1 flex-col gap-1">
          <label className="type-label" htmlFor="fridge-item">
            Item
          </label>
          <div className="relative">
            <Input
              id="fridge-item"
              role="combobox"
              aria-expanded={showList}
              aria-controls="fridge-item-options"
              aria-autocomplete="list"
              aria-activedescendant={activeOption ? optionId(activeOption.id) : undefined}
              autoComplete="off"
              className="w-full"
              value={query}
              onChange={(e) => {
                chooseText(e.target.value);
                setOpen(true);
                setActive(-1);
              }}
              onKeyDown={onItemKeyDown}
              onBlur={closeList}
            />
            {showList && (
              <ul
                id="fridge-item-options"
                role="listbox"
                aria-label="Matching items"
                className="absolute inset-x-0 top-full z-20 mt-1 max-h-60 overflow-auto rounded-control border border-border bg-surface py-1"
              >
                {matches.map((i) => (
                  <li
                    key={i.id}
                    id={optionId(i.id)}
                    role="option"
                    aria-selected={i === activeOption}
                    className={`cursor-pointer px-3 py-2 hover:bg-fill ${i === activeOption ? "bg-fill" : ""}`}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      chooseText(i.name);
                      closeList();
                    }}
                  >
                    {i.name}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <label className="type-label" htmlFor="fridge-amount">
            Amount
          </label>
          <div className="flex items-center gap-2">
            <Input
              id="fridge-amount"
              type="number"
              step="any"
              className="w-24"
              {...register("amountBase", { setValueAs: emptyToUndefinedNumber })}
            />
            {unit && <span className="text-muted">{unit}</span>}
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <label className="type-label" htmlFor="fridge-expires">
            Expires
          </label>
          <Input
            id="fridge-expires"
            type="date"
            onClick={(e) => {
              try {
                e.currentTarget.showPicker();
              } catch {}
            }}
            {...register("expiresOn", { setValueAs: emptyToUndefined })}
          />
        </div>
        <Button type="submit" className="ml-auto" disabled={createItem.isPending}>
          Add to the fridge
        </Button>
      </form>
      {ingredientsQuery.isError && (
        <ErrorState title="Couldn't load items" message={ingredientsQuery.error.message} />
      )}
      {ingredientsQuery.isSuccess && ingredients.length === 0 && (
        <p className="text-muted">No items to pick yet. Add ingredients to a recipe first.</p>
      )}
      {message && <ErrorState id={errorId} title="Couldn't add to the fridge" message={message} />}
    </div>
  );
}
