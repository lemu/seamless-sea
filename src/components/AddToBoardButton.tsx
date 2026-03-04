import { useState } from "react";
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@rafal.lemieszewski/tide-ui";
import { LayoutDashboard } from "lucide-react";
import { AddToBoardModal } from "./AddToBoardModal";
import type { WidgetSource } from "../types/widgets";

interface AddToBoardButtonProps {
  chartTitle: string;
  source: WidgetSource;
}

/**
 * A small "•••" button that can be attached to any chart card header.
 * Shows "Add to Board" option which opens AddToBoardModal.
 */
export function AddToBoardButton({ chartTitle, source }: AddToBoardButtonProps) {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="s"
            icon="more-horizontal"
            aria-label={`Options for ${chartTitle}`}
          />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem
            icon={LayoutDashboard}
            onClick={() => setShowModal(true)}
          >
            Add to Board
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {showModal && (
        <AddToBoardModal
          chartTitle={chartTitle}
          source={source}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}
