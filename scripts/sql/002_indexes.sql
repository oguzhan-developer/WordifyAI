-- Helpful indexes
create index if not exists idx_lists_user on public.lists(user_id);
create index if not exists idx_words_list on public.words(list_id);
create index if not exists idx_words_user on public.words(user_id);
create index if not exists idx_meanings_word on public.meanings(word_id);
create index if not exists idx_examples_word on public.examples(word_id);
create index if not exists idx_reviews_word on public.reviews(word_id);
create index if not exists idx_reviews_user_date on public.reviews(user_id, reviewed_at desc);

-- Simple search index on words.text
create index if not exists idx_words_text on public.words using gin (to_tsvector('simple', text));
