///|
/// Circuit keys and editor fields share the original four-place coordinate format.
pub fn format_coordinate(value : Double) -> String {
  let magnitude = value.abs()
  if !value.is_finite() || magnitude >= 1.0e21 {
    return value.to_string()
  }
  let sign = if value < 0 { "-" } else { "" }
  if magnitude < 0.00001 {
    return sign + "0.0000"
  }
  // A normal binary64 is an integer significand times a power of two.
  // Scale that integer exactly so multiplication cannot round a near tie.
  let bits = magnitude.reinterpret_as_uint64()
  let exponent = (bits >> 52).to_int() - 1023 - 52
  let significand = (bits & 0x000f_ffff_ffff_ffffUL) | (1UL << 52)
  let scaled = @bigint.BigInt::from_uint64(significand) * 10000N
  let rounded = if exponent >= 0 {
    scaled << exponent
  } else {
    let shift = -exponent
    (scaled + (1N << (shift - 1))) >> shift
  }
  let digits = rounded.to_string().pad_start(5, '0')
  let point = digits.length() - 4
  "\{sign}\{digits[:point]}.\{digits[point:]}"
}
