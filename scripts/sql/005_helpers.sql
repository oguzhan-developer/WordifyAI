-- Optional RPC to increment word stats atomically and mark learned after 3 correct
create or replace function public.increment_word_stats(p_word_id uuid, p_correct boolean)
returns void
language plpgsql
security definer
as $$
begin
  if p_correct then
    update public.words
      set correct = correct + 1,
          learned = (correct + 1) >= 3,
          last_reviewed_at = now()
      where id = p_word_id;
  else
    update public.words
      set wrong = wrong + 1,
          last_reviewed_at = now()
      where id = p_word_id;
  end if;
end;
$$;

revoke all on function public.increment_word_stats(uuid, boolean) from public;
grant execute on function public.increment_word_stats(uuid, boolean) to authenticated;
