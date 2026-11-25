///|
#derive(Eq)
priv enum Tab {
  Level
  Skills
}

///|
fn Tab::id(self : Tab) -> String {
  match self {
    Level => "level"
    Skills => "skills"
  }
}

///|
priv enum Selection {
  Nothing
  Whole(Raw)
  Part(root~ : Raw, object~ : Raw)
}

///|
fn Selection::owner(self : Selection) -> Raw? {
  match self {
    Whole(n) | Part(root=n, ..) => Some(n)
    Nothing => None
  }
}

///|
fn Selection::is_owner(self : Selection, n : Raw) -> Bool {
  self.owner() is Some(owner) && n.strict_equal(owner)
}
