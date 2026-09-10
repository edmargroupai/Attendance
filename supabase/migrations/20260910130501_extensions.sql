-- Cryptographic helpers (used for command_receipts.payload_hash in a
-- later stage; gen_random_uuid() is core in PG13+ but pgcrypto is kept
-- for digest()/hashing use).
create extension if not exists pgcrypto with schema extensions;

-- Needed for the enrolment overlap exclusion constraint (uuid equality
-- operators combined with a range && operator inside one GiST index).
create extension if not exists btree_gist with schema extensions;
