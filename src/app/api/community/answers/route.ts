import { dbFailure, readJson, requireUser } from "@/lib/community/apiAuth";
import { json } from "@/lib/community/http";
import { validateAnswerInput } from "@/lib/community/validation";

export const runtime = "nodejs";

// Answer a question. One answer per person per question: a second attempt points
// to the existing answer, which can be edited, and follow-ups go in the replies.
export async function POST(request: Request) {
  const ctx = await requireUser(request, { unavailable: "Answers aren't available right now.", signIn: "Please sign in to answer." });
  if ("response" in ctx) return ctx.response;
  const { supabase, user } = ctx;

  const body = await readJson(request);
  if (body === undefined) return json({ error: "Something went wrong. Please try again." }, 400);
  const parsed = validateAnswerInput(body);
  if (!parsed.ok) return json({ error: parsed.errors.body ?? parsed.errors.questionId ?? "Something went wrong. Please try again.", fields: parsed.errors }, 422);

  const { data, error } = await supabase.from("community_answers").insert({ question_id: parsed.value.questionId, user_id: user.id, body: parsed.value.body }).select("id").single();
  if (error || !data) {
    if (error?.code === "23505") return json({ error: "You've already answered this question. You can edit your answer." }, 409);
    return dbFailure(error, "We couldn't post your answer. Please try again.");
  }
  return json({ id: data.id }, 201);
}
