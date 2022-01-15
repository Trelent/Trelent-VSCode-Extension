export function compareDocstringPoints( docStrA: { point: number[]; }, docStrB: { point: number[]; } ) {
    if ( docStrA.point[0] < docStrB.point[0] ){
      return -1;
    }
    if ( docStrA.point[0] > docStrB.point[0] ){
      return 1;
    }
    return 0;
  }