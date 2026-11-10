import LocalDate from "@/components/community/LocalDate";
import AnswerOwnerTools from "@/components/community/AnswerOwnerTools";
import CommentSection from "@/components/community/CommentSection";
import { ANSWER_VOTES, HelpfulButton } from "@/components/community/HelpfulVotes";
import ReportButton from "@/components/community/ReportButton";
import Tx from "@/components/i18n/Tx";
import type { CommunityAnswer, CommunityComment } from "@/lib/community/types";

// One answer: who wrote it and when, the words, a "helpful" vote, and a
// collapsible thread of replies. Your own answer has edit and delete instead of
// helpful and report (you can't vote for yourself).
export default function AnswerCard({ answer, replies }: { answer: CommunityAnswer; replies: CommunityComment[] }) {
  return (
    <article className="rounded-2xl border border-glass-border bg-panel/60 p-4 backdrop-blur-xl sm:p-5">
      {answer.isMine && answer.status !== "published" && (
        <p role="status" className="mb-3 rounded-xl border border-gold/40 bg-gold/10 px-3 py-2 text-xs text-foreground">
          <Tx en="This answer is hidden. Only you can see it." />
        </p>
      )}
      <div className="flex items-center gap-2.5">
        {answer.author.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={answer.author.avatarUrl} alt="" loading="lazy" decoding="async" className="h-8 w-8 rounded-full object-cover" />
        ) : (
          <span aria-hidden="true" className="flex h-8 w-8 items-center justify-center rounded-full bg-lilac/20 text-sm font-semibold uppercase text-lilac">
            {answer.author.username.slice(0, 1)}
          </span>
        )}
        <div>
          <p className="text-sm font-medium text-foreground">
            {answer.author.username}
            {answer.isMine && (
              <span className="ml-2 rounded-full bg-lilac/20 px-2 py-0.5 text-[10px] font-semibold text-lilac">
                <Tx en="You" />
              </span>
            )}
          </p>
          <p className="text-xs text-foreground/75">
            <LocalDate iso={answer.createdAt} />
            {answer.edited && (
              <>
                {" · "}
                <Tx en="edited" />
              </>
            )}
          </p>
        </div>
      </div>
      <p className="mt-3 whitespace-pre-line break-words text-sm leading-relaxed text-foreground/95 sm:text-base">{answer.body}</p>

      {answer.isMine ? (
        <AnswerOwnerTools id={answer.id} body={answer.body} />
      ) : (
        <div className="mt-3 flex flex-wrap items-center gap-1">
          <HelpfulButton id={answer.id} target={ANSWER_VOTES} count={answer.helpfulCount} isMine={false} ownHint="You can't vote on your own answer." />
          <ReportButton targetType="answer" targetId={answer.id} />
        </div>
      )}

      <div className="mt-3 border-t border-glass-border pt-3">
        <CommentSection target={{ type: "answer", id: answer.id }} comments={replies} collapsible />
      </div>
    </article>
  );
}
