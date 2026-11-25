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
  Whole(SceneNode)
  Part(root~ : SceneNode, object~ : SceneNode)
}

///|
fn Selection::owner(self : Selection) -> SceneNode? {
  match self {
    Whole(n) | Part(root=n, ..) => Some(n)
    Nothing => None
  }
}

///|
fn Selection::is_owner(self : Selection, n : SceneNode) -> Bool {
  self.owner() is Some(owner) && n.id == owner.id
}
