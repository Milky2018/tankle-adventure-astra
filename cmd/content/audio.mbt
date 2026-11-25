///|
#derive(FromJson(fields(wave(rename="type"))))
priv struct SoundLayer {
  noise : Bool?
  wave : String?
  frequency : Double?
  end : Double?
  cutoff : Double?
  filter : String?
  gain : Double
  duration : Double
  delay : Double?
  attack : Double?
  hold : Double?
}

///|
fn SoundLayer::voice_source(self : SoundLayer) -> String {
  let voice = if self.noise == Some(true) {
    "Noise"
  } else {
    "Tone(wave=\{source(self.wave.unwrap_or("sine"))},from_hz=\{source(self.frequency.unwrap_or(0))},to_hz=\{source(self.end.unwrap_or(0))})"
  }
  let filter = match self.cutoff {
    None | Some(0) => "None"
    Some(hz) =>
      "Some((\{source(self.filter.unwrap_or("lowpass"))},\{source(hz)}))"
  }
  let attack = self.attack.unwrap_or(0.003).min(self.duration * 0.3)
  let hold = self.hold.unwrap_or(0).min(self.duration * 0.5)
  (
    $|{
    $|  source: \{voice}, filter: \{filter},
    $|  duration: \{source(self.duration)}, gain: \{source(self.gain)},
    $|  delay: \{source(self.delay.unwrap_or(0))}, attack: \{source(attack)}, hold: \{source(hold)}
    $|}
  )
}

///|
#derive(FromJson)
priv struct MusicTrack {
  id : String
  assets : TrackAssets
  gain : Double?
}

///|
#derive(FromJson)
priv struct TrackAssets {
  mix : String
}

///|
fn generate_audio() -> Unit raise {
  // Optional authoring fields historically treat an explicit null as omitted.
  let input = read_json("content/sounds.json").transform(
    @json.Replacer((_, v) => if v is Null { None } else { Some(v) }),
  )
  let effects : Map[String, Array[SoundLayer]] = @json.from_json(input)
  let voices = [
    for name, layers in effects => {
      source(name) +
      ": [" +
      layers.map(layer => layer.voice_source()).join(",") +
      "]"
    }
  ]
  let manifest = read_json("public/music/manifest.json")
  guard manifest is { "tracks": Array(tracks), .. } else {
    raise Failure("Music manifest needs a tracks array")
  }
  let music = tracks.map(track => {
    let track : MusicTrack = @json.from_json(
      track.transform(
        @json.Replacer((_, v) => if v is Null { None } else { Some(v) }),
      ),
    )
    "\{source(track.id)}: (\{source("/music/" + track.assets.mix)},\{source(track.gain.unwrap_or(1))})"
  })
  let data =
    $|// Authored sound parameters.
    $|///|
    $|let sound_layers : Map[String, Array[@host.Voice]] = {
    $|\{voices.join(",\n")}
    $|}
    $|///|
    $|let music_tracks : Map[String, (String, Double)] = {
    $|\{music.join(",\n")}
    $|}
    $|
  @fs.write_string_to_file("cmd/play/sound-data.generated.mbt", data)
}
