"use client";

import { Button } from "@/components/reusables/button";
import {
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from "@/components/reusables/modal";

interface DeleteMailModalProps {
  conversationCount: number;
  conversationSubject?: string;
  deleting: boolean;
  mode: "empty-trash" | "threads";
  onCancel: () => void;
  onConfirm: () => void;
  open: boolean;
}

export function DeleteMailModal({
  conversationCount,
  conversationSubject,
  deleting,
  mode,
  onCancel,
  onConfirm,
  open,
}: DeleteMailModalProps) {
  const emptyingTrash = mode === "empty-trash";

  return (
    <Modal
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && !deleting) {
          onCancel();
        }
      }}
    >
      <ModalContent size="sm" className="border-bd-30 bg-bk-90">
        <ModalHeader>
          <ModalTitle>
            {emptyingTrash ? "Empty trash" : "Delete permanently"}
          </ModalTitle>
        </ModalHeader>

        <ModalBody>
          <p className="text-xs leading-relaxed text-fg-50">
            {emptyingTrash ? (
              "Do you really want to permanently delete every conversation in Trash?"
            ) : conversationCount === 1 && conversationSubject ? (
              <>
                Do you really want to permanently delete{" "}
                <span className="font-medium text-fg-30">
                  &quot;{conversationSubject}&quot;
                </span>
                ?
              </>
            ) : (
              `Do you really want to permanently delete ${conversationCount} conversations?`
            )}
          </p>
          <p className="mt-1 text-xs text-fg-60">
            This action cannot be undone.
          </p>
        </ModalBody>

        <ModalFooter>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onCancel}
            disabled={deleting}
            className="bg-bk-80 hover:bg-bk-70"
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="danger"
            size="sm"
            onClick={onConfirm}
            disabled={deleting}
          >
            {deleting
              ? emptyingTrash
                ? "Emptying..."
                : "Deleting..."
              : emptyingTrash
                ? "Empty trash"
                : "Delete"}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
