"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";

import {
  extractEmailAddress,
  uniqueEmailAddresses,
} from "@/lib/email/address";
import { plainTextToHtml } from "@/lib/email/html";
import type { MailDraft } from "@/lib/draft/types";
import {
  MAX_ATTACHMENT_COUNT,
  MAX_EMAIL_RECIPIENTS,
  MAX_TOTAL_ATTACHMENT_BYTES,
  type EmailAttachment,
  type MailboxEmail,
} from "@/lib/email/types";
import type { Mailbox } from "@/lib/mailbox/types";

import { sendEmailAction } from "./actions";
import {
  deleteDraftAction,
  saveDraftAction,
} from "../draft/actions";
import type { ComposeRouteMode, HomeView } from "../../types";
import type { ReplyMode } from "../thread";
import type { MailboxView } from "../thread/state";
import {
  createForwardedMessage,
  createSignatureBlock,
  getAttachmentLimitMessage,
  replaceSignatureBlock,
  replaceSignatureHtml,
} from "./utils";
import type {
  ComposeActions,
  ComposeMode,
  ComposeStatus,
  ComposeValue,
  DraftSaveStatus,
  RecipientGroup,
} from ".";

interface UseComposeOptions {
  activeView: HomeView;
  composeMode?: ComposeRouteMode;
  currentFolder: MailboxView;
  selectedMailbox?: Mailbox;
  onDraftDeleted: (draftId: string) => void;
  onDraftUpsert: (draft: MailDraft) => void;
  onComposeClose: () => void;
  onComposeModeChange: (mode: ComposeRouteMode) => void;
  onViewChange: (view: HomeView) => void;
  onWarning: (message: string) => void;
}

export function useCompose({
  activeView,
  composeMode,
  currentFolder,
  selectedMailbox,
  onDraftDeleted,
  onDraftUpsert,
  onComposeClose,
  onComposeModeChange,
  onViewChange,
  onWarning,
}: UseComposeOptions) {
  const [toRecipients, setToRecipients] = useState<string[]>([]);
  const [ccRecipients, setCcRecipients] = useState<string[]>([]);
  const [bccRecipients, setBccRecipients] = useState<string[]>([]);
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [bodyHtml, setBodyHtml] = useState("");
  const [attachments, setAttachments] = useState<File[]>([]);
  const [forwardedEmailId, setForwardedEmailId] = useState("");
  const [replyToEmailId, setReplyToEmailId] = useState("");
  const [forwardedAttachments, setForwardedAttachments] = useState<
    EmailAttachment[]
  >([]);
  const [sending, setSending] = useState(false);
  const [sendStatus, setSendStatus] = useState("");
  const [activeDraftId, setActiveDraftId] = useState("");
  const [draftSaveStatus, setDraftSaveStatus] =
    useState<DraftSaveStatus>("idle");
  const mode = composeMode ?? "floating";
  const attachmentInput = useRef<HTMLInputElement>(null);
  const draftSaveSequence = useRef(0);
  const wasComposeOpen = useRef(Boolean(composeMode));
  const appliedSignatureBlock = useRef("");

  const hasDraftContent = useCallback(() => {
    const signatureOnly =
      Boolean(appliedSignatureBlock.current) &&
      body.trim() === appliedSignatureBlock.current.trim();

    return (
      toRecipients.length > 0 ||
      ccRecipients.length > 0 ||
      bccRecipients.length > 0 ||
      Boolean(subject.trim()) ||
      (Boolean(body.trim()) && !signatureOnly) ||
      attachments.length > 0 ||
      forwardedAttachments.length > 0 ||
      Boolean(replyToEmailId) ||
      Boolean(forwardedEmailId)
    );
  }, [
    attachments.length,
    bccRecipients.length,
    body,
    ccRecipients.length,
    forwardedAttachments.length,
    forwardedEmailId,
    replyToEmailId,
    subject,
    toRecipients.length,
  ]);

  useEffect(() => {
    const enteredCompose =
      Boolean(composeMode) && !wasComposeOpen.current;
    wasComposeOpen.current = Boolean(composeMode);

    if (!composeMode) {
      appliedSignatureBlock.current = "";
      return;
    }

    const nextSignatureBlock = createSignatureBlock(
      selectedMailbox?.signature,
    );

    if (enteredCompose) {
      appliedSignatureBlock.current = nextSignatureBlock;
      setBody((currentBody) => currentBody || nextSignatureBlock);
      setBodyHtml(
        (currentHtml) =>
          currentHtml || plainTextToHtml(nextSignatureBlock),
      );
      return;
    }

    if (nextSignatureBlock !== appliedSignatureBlock.current) {
      const previousSignatureBlock = appliedSignatureBlock.current;
      appliedSignatureBlock.current = nextSignatureBlock;
      setBody((currentBody) =>
        replaceSignatureBlock(
          currentBody,
          previousSignatureBlock,
          nextSignatureBlock,
        ),
      );
      setBodyHtml((currentHtml) =>
        replaceSignatureHtml(
          currentHtml,
          previousSignatureBlock,
          nextSignatureBlock,
        ),
      );
    }
  }, [activeView, composeMode, selectedMailbox?.signature]);

  useEffect(() => {
    if (
      !composeMode ||
      !selectedMailbox ||
      sending ||
      !hasDraftContent()
    ) {
      return;
    }

    const timeout = window.setTimeout(() => {
      const draftId =
        activeDraftId || `draft_${crypto.randomUUID()}`;
      const sequence = ++draftSaveSequence.current;
      if (!activeDraftId) {
        setActiveDraftId(draftId);
      }
      setDraftSaveStatus("saving");

      void saveDraftAction({
        id: draftId,
        mailboxId: selectedMailbox.id,
        to: toRecipients,
        cc: ccRecipients,
        bcc: bccRecipients,
        subject,
        text: body,
        html: bodyHtml,
        replyToEmailId,
        forwardedEmailId,
        forwardedAttachments,
      })
        .then((result) => {
          if (sequence !== draftSaveSequence.current) {
            return;
          }

          if (!result.ok || !result.draft) {
            setDraftSaveStatus("error");
            return;
          }

          onDraftUpsert(result.draft);
          setDraftSaveStatus("saved");
        })
        .catch(() => {
          if (sequence === draftSaveSequence.current) {
            setDraftSaveStatus("error");
          }
        });
    }, 1_200);

    return () => window.clearTimeout(timeout);
  }, [
    activeDraftId,
    attachments.length,
    bccRecipients,
    body,
    bodyHtml,
    ccRecipients,
    composeMode,
    forwardedAttachments,
    forwardedEmailId,
    hasDraftContent,
    onDraftUpsert,
    replyToEmailId,
    selectedMailbox,
    sending,
    subject,
    toRecipients,
  ]);

  function updateRecipients(
    group: RecipientGroup,
    values: string[],
  ) {
    const groups = {
      to: toRecipients,
      cc: ccRecipients,
      bcc: bccRecipients,
    };
    const otherAddresses = new Set(
      (Object.keys(groups) as RecipientGroup[])
        .filter((key) => key !== group)
        .flatMap((key) => groups[key])
        .map(extractEmailAddress),
    );
    const availableSlots =
      MAX_EMAIL_RECIPIENTS -
      (Object.keys(groups) as RecipientGroup[])
        .filter((key) => key !== group)
        .reduce((total, key) => total + groups[key].length, 0);
    const uniqueValues = uniqueEmailAddresses(values).filter(
      (address) => !otherAddresses.has(address),
    );
    const nextValues = uniqueValues.slice(0, Math.max(availableSlots, 0));

    setSendStatus(
      uniqueValues.length > nextValues.length
        ? `You can send to up to ${MAX_EMAIL_RECIPIENTS} recipients.`
        : "",
    );

    if (group === "to") {
      setToRecipients(nextValues);
    } else if (group === "cc") {
      setCcRecipients(nextValues);
      setShowCc(true);
    } else {
      setBccRecipients(nextValues);
      setShowBcc(true);
    }
  }

  function getReplyRecipients(email: MailboxEmail, replyMode: ReplyMode) {
    const replyAddress = extractEmailAddress(
      email.replyTo[0] ?? email.from,
    );

    if (replyMode === "reply") {
      return { to: [replyAddress], cc: [] };
    }

    const ownAddress = selectedMailbox
      ? extractEmailAddress(selectedMailbox.email)
      : "";
    const to = uniqueEmailAddresses([replyAddress, ...email.to]).filter(
      (address) => address !== ownAddress,
    );
    const toAddresses = new Set(to);
    const cc = uniqueEmailAddresses(email.cc).filter(
      (address) => address !== ownAddress && !toAddresses.has(address),
    );

    return { to, cc };
  }

  function startReply(email: MailboxEmail, replyMode: ReplyMode) {
    const recipients = getReplyRecipients(email, replyMode);
    const signatureBlock = createSignatureBlock(
      selectedMailbox?.signature,
    );

    setToRecipients(recipients.to);
    setCcRecipients(recipients.cc);
    setBccRecipients([]);
    setShowCc(recipients.cc.length > 0);
    setShowBcc(false);
    setSubject(
      email.subject.toLowerCase().startsWith("re:")
        ? email.subject
        : `Re: ${email.subject}`,
    );
    setBody(signatureBlock);
    setBodyHtml(plainTextToHtml(signatureBlock));
    appliedSignatureBlock.current = signatureBlock;
    setAttachments([]);
    setReplyToEmailId(email.id);
    setForwardedEmailId("");
    setForwardedAttachments([]);
    setActiveDraftId("");
    setDraftSaveStatus("idle");
    clearAttachmentInput();
    setSendStatus("");
    onComposeModeChange(mode);
  }

  function canReplyAll(email: MailboxEmail) {
    const recipients = getReplyRecipients(email, "reply-all");
    return recipients.to.length + recipients.cc.length > 1;
  }

  function startForward(email: MailboxEmail) {
    const signatureBlock = createSignatureBlock(
      selectedMailbox?.signature,
    );
    const originalAttachments = (email.attachments ?? []).filter(
      (
        attachment,
      ): attachment is EmailAttachment & { id: string } =>
        Boolean(attachment.id),
    );
    setToRecipients([]);
    setCcRecipients([]);
    setBccRecipients([]);
    setShowCc(false);
    setShowBcc(false);
    setSubject(
      /^(?:fw|fwd):/i.test(email.subject)
        ? email.subject
        : `Fwd: ${email.subject}`,
    );
    const forwardedBody =
      `${signatureBlock}${createForwardedMessage(email)}`;
    setBody(forwardedBody);
    setBodyHtml(plainTextToHtml(forwardedBody));
    appliedSignatureBlock.current = signatureBlock;
    setAttachments([]);
    setReplyToEmailId("");
    setForwardedEmailId(email.id);
    setForwardedAttachments(originalAttachments);
    setActiveDraftId("");
    setDraftSaveStatus("idle");
    const unavailableAttachmentCount =
      (email.attachments?.length ?? 0) - originalAttachments.length;
    const limitMessage = getAttachmentLimitMessage(
      originalAttachments,
    );

    setSendStatus(
      limitMessage ||
        (unavailableAttachmentCount > 0
          ? `${unavailableAttachmentCount} original ${
              unavailableAttachmentCount === 1
                ? "attachment is"
                : "attachments are"
            } unavailable.`
          : ""),
    );
    clearAttachmentInput();
    onComposeModeChange(mode);
  }

  function selectAttachments(event: ChangeEvent<HTMLInputElement>) {
    const selectedFiles = Array.from(event.target.files ?? []);
    event.target.value = "";

    if (selectedFiles.length === 0) {
      return;
    }

    const fileKeys = new Set(
      attachments.map(
        (file) => `${file.name}:${file.size}:${file.lastModified}`,
      ),
    );
    const nextAttachments = [...attachments];
    let totalBytes =
      attachments.reduce((total, file) => total + file.size, 0) +
      forwardedAttachments.reduce(
        (total, attachment) => total + attachment.size,
        0,
      );
    let exceededCount = false;
    let exceededSize = false;

    for (const file of selectedFiles) {
      const key = `${file.name}:${file.size}:${file.lastModified}`;

      if (fileKeys.has(key)) {
        continue;
      }

      if (
        nextAttachments.length + forwardedAttachments.length >=
        MAX_ATTACHMENT_COUNT
      ) {
        exceededCount = true;
        break;
      }

      if (totalBytes + file.size > MAX_TOTAL_ATTACHMENT_BYTES) {
        exceededSize = true;
        continue;
      }

      fileKeys.add(key);
      totalBytes += file.size;
      nextAttachments.push(file);
    }

    setAttachments(nextAttachments);
    setSendStatus(
      exceededCount
        ? `You can attach up to ${MAX_ATTACHMENT_COUNT} files.`
        : exceededSize
          ? "Attachments can be up to 29 MB total."
          : "",
    );
  }

  function reset() {
    draftSaveSequence.current += 1;
    setActiveDraftId("");
    setDraftSaveStatus("idle");
    setToRecipients([]);
    setCcRecipients([]);
    setBccRecipients([]);
    setShowCc(false);
    setShowBcc(false);
    setSubject("");
    setBody("");
    setBodyHtml("");
    setAttachments([]);
    setReplyToEmailId("");
    setForwardedEmailId("");
    setForwardedAttachments([]);
    appliedSignatureBlock.current = "";
    setSendStatus("");
    clearAttachmentInput();
  }

  function discard() {
    const discardedDraftId = activeDraftId;
    reset();

    if (discardedDraftId) {
      onDraftDeleted(discardedDraftId);
      void deleteDraftAction(discardedDraftId).catch(() => undefined);
    }

    onComposeClose();
  }

  async function dismiss() {
    if (!selectedMailbox || !hasDraftContent()) {
      onComposeClose();
      return;
    }

    const draftId =
      activeDraftId || `draft_${crypto.randomUUID()}`;
    const sequence = ++draftSaveSequence.current;

    setActiveDraftId(draftId);
    setDraftSaveStatus("saving");

    try {
      const result = await saveDraftAction({
        id: draftId,
        mailboxId: selectedMailbox.id,
        to: toRecipients,
        cc: ccRecipients,
        bcc: bccRecipients,
        subject,
        text: body,
        html: bodyHtml,
        replyToEmailId,
        forwardedEmailId,
        forwardedAttachments,
      });

      if (sequence !== draftSaveSequence.current) {
        return;
      }

      if (!result.ok || !result.draft) {
        setDraftSaveStatus("error");
        return;
      }

      onDraftUpsert(result.draft);
      setDraftSaveStatus("saved");
      onComposeClose();
    } catch {
      if (sequence === draftSaveSequence.current) {
        setDraftSaveStatus("error");
      }
    }
  }

  function openDraft(draft: MailDraft) {
    const signatureBlock = createSignatureBlock(
      selectedMailbox?.signature,
    );

    draftSaveSequence.current += 1;
    setActiveDraftId(draft.id);
    setDraftSaveStatus("saved");
    setToRecipients(draft.to);
    setCcRecipients(draft.cc);
    setBccRecipients(draft.bcc);
    setShowCc(draft.cc.length > 0);
    setShowBcc(draft.bcc.length > 0);
    setSubject(draft.subject);
    setBody(draft.text);
    setBodyHtml(draft.html || plainTextToHtml(draft.text));
    setAttachments([]);
    setReplyToEmailId(draft.replyToEmailId);
    setForwardedEmailId(draft.forwardedEmailId);
    setForwardedAttachments(draft.forwardedAttachments);
    appliedSignatureBlock.current =
      signatureBlock && draft.text.includes(signatureBlock)
        ? signatureBlock
        : "";
    setSendStatus("");
    clearAttachmentInput();
    onComposeModeChange(mode);
  }

  async function removeSavedDraft(draft: MailDraft) {
    onDraftDeleted(draft.id);

    if (activeDraftId === draft.id) {
      draftSaveSequence.current += 1;
      setActiveDraftId("");
      setDraftSaveStatus("idle");
    }

    try {
      const result = await deleteDraftAction(draft.id);

      if (result.ok) {
        return;
      }

      onDraftUpsert(draft);
      onWarning(result.error || "Unable to delete this draft.");
    } catch {
      onDraftUpsert(draft);
      onWarning("Unable to delete this draft.");
    }
  }

  function removeAttachment(index: number) {
    const nextAttachments = attachments.filter(
      (_, attachmentIndex) => attachmentIndex !== index,
    );
    setAttachments(nextAttachments);
    setSendStatus(
      getAttachmentLimitMessage([
        ...forwardedAttachments,
        ...nextAttachments,
      ]),
    );
  }

  function removeForwardedAttachment(index: number) {
    const nextAttachments = forwardedAttachments.filter(
      (_, attachmentIndex) => attachmentIndex !== index,
    );
    setForwardedAttachments(nextAttachments);
    setSendStatus(
      getAttachmentLimitMessage([...nextAttachments, ...attachments]),
    );
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSendStatus("");
    setSending(true);

    try {
      const formData = new FormData(event.currentTarget);
      formData.set("mailboxId", selectedMailbox?.id ?? "");
      formData.set("subject", subject);
      formData.set("text", body);
      formData.set("html", bodyHtml);
      if (replyToEmailId) {
        formData.set("replyToEmailId", replyToEmailId);
      }
      if (activeDraftId) {
        formData.set("draftId", activeDraftId);
      }
      attachments.forEach((file) => {
        formData.append("attachments", file, file.name);
      });
      if (forwardedEmailId && forwardedAttachments.length) {
        formData.set("forwardedEmailId", forwardedEmailId);
        forwardedAttachments.forEach((attachment) => {
          if (attachment.id) {
            formData.append("forwardedAttachmentId", attachment.id);
          }
        });
      }

      const result = await sendEmailAction(formData);

      if (!result.ok) {
        setSendStatus(result.error || "Unable to send this email.");
        return;
      }

      const sentDraftId = activeDraftId;
      reset();
      if (sentDraftId) {
        onDraftDeleted(sentDraftId);
      }
      onComposeClose();
      onViewChange("sent");
    } catch {
      setSendStatus("Unable to send this email.");
    } finally {
      setSending(false);
    }
  }

  function clearAttachmentInput() {
    if (attachmentInput.current) {
      attachmentInput.current.value = "";
    }
  }

  const value: ComposeValue = {
    attachments,
    bcc: bccRecipients,
    body,
    bodyHtml,
    cc: ccRecipients,
    forwardedAttachments,
    isForwarding: Boolean(forwardedEmailId),
    showBcc,
    showCc,
    subject,
    to: toRecipients,
  };
  const status: ComposeStatus = {
    canSend: Boolean(selectedMailbox),
    draft: draftSaveStatus,
    message: sendStatus,
    sending,
  };
  const actions: ComposeActions = {
    changeBody: (nextValue) => {
      setBody(nextValue.text);
      setBodyHtml(nextValue.html);
    },
    changeMode: onComposeModeChange,
    changeRecipients: updateRecipients,
    changeSubject: setSubject,
    discard,
    dismiss,
    invalid: setSendStatus,
    removeAttachment,
    removeForwardedAttachment,
    selectAttachments,
    showRecipient: (group) => {
      if (group === "cc") {
        setShowCc(true);
      } else {
        setShowBcc(true);
      }
    },
    submit,
  };

  return {
    actions,
    attachmentInput,
    canReplyAll,
    mode,
    openDraft,
    removeSavedDraft,
    startForward,
    startReply,
    status,
    value,
  };
}
