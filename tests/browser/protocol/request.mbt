///|
#derive(@json.FromJson, @json.ToJson)
pub(all) enum Request {
  PageUrl
  BodyText
  GameReady
  PlayerSnapshot
  Project(Double, Double, Double)
  NextFrame
  Visible(String)
  Center(String)
  HasAttribute(String, String)
  Attribute(String, String)
  TextContent(String)
  ElementCount(String)
  InputValue(String)
  SetSlider(String, String)
  Drag(Int32, Int32)
  Look(Bool)
  StartupTiming
  BeginFrameSample
  EndFrameSample
}
