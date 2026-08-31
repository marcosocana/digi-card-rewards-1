import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ProgramMechanicSwitch } from "@/components/app/program-mechanic-switch";

describe("ProgramMechanicSwitch", () => {
  it("exposes the selected mechanic as an accessible radio group", () => {
    render(<ProgramMechanicSwitch value="points" onChange={vi.fn()} />);
    expect(screen.getByRole("radiogroup", { name: "Tipo de programa" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Puntos" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "Sellos" })).not.toBeChecked();
  });

  it("changes mechanic when the user selects the other option", async () => {
    const onChange = vi.fn();
    render(<ProgramMechanicSwitch value="points" onChange={onChange} />);
    await userEvent.click(screen.getByRole("radio", { name: "Sellos" }));
    expect(onChange).toHaveBeenCalledWith("stamps");
  });

  it("does not change while disabled", async () => {
    const onChange = vi.fn();
    render(<ProgramMechanicSwitch value="points" onChange={onChange} disabled />);
    await userEvent.click(screen.getByRole("radio", { name: "Sellos" }));
    expect(onChange).not.toHaveBeenCalled();
  });
});
