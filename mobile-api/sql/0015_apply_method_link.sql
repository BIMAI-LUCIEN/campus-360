-- Adds the 'LINK' apply method (Module 25, task 25.17). Idempotent.
-- A scraped offer (LinkedIn via Treg) often has no email and no WhatsApp number,
-- only the URL of the posting. Such an offer used to be stored as 'PHYSICAL'
-- ("apply on site"), which is wrong and leaves the one-click apply with no recipient.
-- 'LINK' means: the student applies on the website of the posting.
--
-- Run this statement ALONE: a value added to an enum inside a transaction cannot be
-- used before that transaction commits, so there is no begin/commit here.
alter type apply_method add value if not exists 'LINK';
