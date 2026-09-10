-- Spec section 2: P = Present, A = Absent, L = Late, Ex = Excused.
-- The column that uses this type is nullable, so "blank" is represented
-- by NULL, not a fifth enum value (spec: "Never label blank as absent").
create type attendance_status as enum ('P', 'A', 'L', 'Ex');

-- Spec section 1: BOYS and GIRLS sections.
create type register_group as enum ('Boy', 'Girl');
