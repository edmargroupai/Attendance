-- Same class of bug as the owner_id fix: actor_id's FK had no ON DELETE
-- action (defaults to RESTRICT), so deleting a user who ever acted on
-- anything (almost always true - they act on their own data) was
-- blocked. Unlike owner_id, actor_id is dropped to SET NULL rather than
-- having its FK removed entirely: the audit row (what happened, when,
-- to which entity) should still survive and still be worth having FK
-- integrity on while the actor exists, but must not block deletion once
-- they're gone.
alter table audit_events
  drop constraint audit_events_actor_id_fkey,
  add constraint audit_events_actor_id_fkey
    foreign key (actor_id) references auth.users (id) on delete set null;
