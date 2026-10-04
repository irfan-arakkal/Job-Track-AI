"use client";

import { Check, Copy, KeyRound, Loader2, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { createApiTokenAction, revokeApiTokenAction } from "@/features/settings/actions";
import { formatDate } from "@/lib/format";

type Token = {
  id: string;
  name: string;
  prefix: string;
  createdAt: Date;
  lastUsedAt: Date | null;
  expiresAt: Date | null;
};

export function ApiTokens({ tokens, mcpUrl }: { tokens: Token[]; mcpUrl: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [expires, setExpires] = useState("90");
  const [newToken, setNewToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();

  function create(event: React.FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      const result = await createApiTokenAction({ name, expiresInDays: expires });
      if (!result.ok) {
        toast.error(result.fieldErrors?.name?.[0] ?? result.message);
        return;
      }
      setNewToken(result.data.token);
      setCopied(false);
      setName("");
      router.refresh();
    });
  }

  function revoke(id: string) {
    startTransition(async () => {
      const result = await revokeApiTokenAction(id);
      if (!result.ok) return void toast.error(result.message);
      toast.success("Token revoked. Clients using it lose access immediately.");
      router.refresh();
    });
  }

  async function copy(text: string) {
    await navigator.clipboard.writeText(text);
    setCopied(true);
  }

  return (
    <div className="grid gap-5">
      <p className="text-muted-foreground text-sm">
        Tokens let MCP clients (Claude Code, Claude Desktop, AI agents) read and manage your
        applications. Treat them like passwords. MCP endpoint:{" "}
        <code className="bg-muted rounded px-1 py-0.5 text-xs">{mcpUrl}</code>
      </p>

      {newToken ? (
        <Alert>
          <KeyRound />
          <AlertTitle>Copy your new token now — it won&apos;t be shown again</AlertTitle>
          <AlertDescription className="w-full">
            <div className="mt-2 flex w-full items-center gap-2">
              <code
                className="bg-muted min-w-0 flex-1 truncate rounded px-2 py-1.5 text-xs"
                data-testid="new-token"
              >
                {newToken}
              </code>
              <Button type="button" size="sm" variant="outline" onClick={() => copy(newToken)}>
                {copied ? <Check /> : <Copy />} {copied ? "Copied" : "Copy"}
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      ) : null}

      <form onSubmit={create} className="grid gap-3 sm:grid-cols-[1fr_160px_auto] sm:items-end">
        <div className="grid gap-2">
          <Label htmlFor="token-name">Token name</Label>
          <Input
            id="token-name"
            value={name}
            maxLength={100}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Claude Code on laptop"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="token-expiry">Expires</Label>
          <NativeSelect
            id="token-expiry"
            value={expires}
            onChange={(e) => setExpires(e.target.value)}
          >
            <option value="7">In 7 days</option>
            <option value="30">In 30 days</option>
            <option value="90">In 90 days</option>
            <option value="365">In 1 year</option>
            <option value="never">Never</option>
          </NativeSelect>
        </div>
        <Button type="submit" disabled={isPending || !name.trim()}>
          {isPending ? <Loader2 className="animate-spin" /> : <KeyRound />} Create token
        </Button>
      </form>

      {tokens.length === 0 ? (
        <p className="text-muted-foreground text-sm">No active tokens.</p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {tokens.map((token) => (
            <li
              key={token.id}
              className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="truncate font-medium">{token.name}</p>
                <p className="text-muted-foreground text-xs">
                  <code>{token.prefix}…</code> · created {formatDate(token.createdAt)} ·{" "}
                  {token.lastUsedAt ? `last used ${formatDate(token.lastUsedAt)}` : "never used"} ·{" "}
                  {token.expiresAt ? `expires ${formatDate(token.expiresAt)}` : "no expiry"}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled={isPending}
                onClick={() => revoke(token.id)}
              >
                <Trash2 /> Revoke
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
