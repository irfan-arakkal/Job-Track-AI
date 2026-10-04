import { createTokenSchema } from "@/features/settings/token-schemas";
import { readJson, withAuth } from "@/server/http";
import { createApiToken, listApiTokens } from "@/server/services/api-tokens";

// Token management requires a browser session — a token can't be used to mint more tokens.
export const GET = withAuth(async ({ user }) => Response.json(await listApiTokens(user.id)));

export const POST = withAuth(async ({ request, user }) => {
  const { name, expiresInDays } = createTokenSchema.parse(await readJson(request));
  return Response.json(await createApiToken(user.id, name, expiresInDays), { status: 201 });
});
