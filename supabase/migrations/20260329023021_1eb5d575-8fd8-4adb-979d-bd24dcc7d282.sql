
-- Delete submissions linked to challenges in test competitions
DELETE FROM public.submissions WHERE challenge_id IN (
  SELECT id FROM public.challenges WHERE competition_id IN (
    '38b02f03-2026-438c-952f-2939dcf3acb7',
    '959b8e0a-f732-454f-9ecd-0896b9191477',
    'c690b169-b5cf-45c3-81e2-ac9342ac2831'
  )
);

-- Delete challenges in test competitions
DELETE FROM public.challenges WHERE competition_id IN (
  '38b02f03-2026-438c-952f-2939dcf3acb7',
  '959b8e0a-f732-454f-9ecd-0896b9191477',
  'c690b169-b5cf-45c3-81e2-ac9342ac2831'
);

-- Delete memberships in test competitions
DELETE FROM public.competition_memberships WHERE competition_id IN (
  '38b02f03-2026-438c-952f-2939dcf3acb7',
  '959b8e0a-f732-454f-9ecd-0896b9191477',
  'c690b169-b5cf-45c3-81e2-ac9342ac2831'
);

-- Delete the test competitions themselves
DELETE FROM public.competitions WHERE id IN (
  '38b02f03-2026-438c-952f-2939dcf3acb7',
  '959b8e0a-f732-454f-9ecd-0896b9191477',
  'c690b169-b5cf-45c3-81e2-ac9342ac2831'
);
