// quaterion utilities, used in vertex and fragment shaders

mat3 quat2Mat(vec4 q) {
    float x = q.x, y = q.y, z = q.z, w = q.w;
    float x2 = x + x, y2 = y + y, z2 = z + z;
    float xx = x * x2, xy = x * y2, xz = x * z2;
    float yy = y * y2, yz = y * z2, zz = z * z2;
    float wx = w * x2, wy = w * y2, wz = w * z2;
    return mat3(
        1. - ( yy + zz ),
        xy - wz,
        xz + wy,

        xy + wz,
        1. - ( xx + zz ),
        yz - wx,

        xz - wy,
        yz + wx,
        1. - ( xx + yy )
    );
}


vec4 mat2Quat ( mat3 m ) {
    // from three.hs
    // http://www.euclideanspace.com/maths/geometry/rotations/conversions/matrixToQuaternion/index.htm
    // assumes the upper 3x3 of m is a pure rotation matrix (i.e, unscaled)

 
    vec4 quat;
    float trace = m[0][0] + m[1][1] + m[2][2], s;

    if ( trace > 0. ) {

        s = 0.5 / sqrt( trace + 1.0 );

        quat.w = 0.25 / s;
        quat.x = ( m[2][1] - m[1][2] ) * s;
        quat.y = ( m[0][2] - m[2][0] ) * s;
        quat.z = ( m[1][0] - m[0][1] ) * s;

    } else if ( m[0][0] > m[1][1] && m[0][0] > m[2][2] ) {

        s = 2.0 * sqrt( 1.0 + m[0][0] - m[1][1] - m[2][2] );

        quat.w = ( m[2][1] - m[1][2] ) / s;
        quat.x = 0.25 * s;
        quat.y = ( m[0][1] + m[1][0] ) / s;
        quat.z = ( m[0][2] + m[2][0] ) / s;

    } else if ( m[1][1] > m[2][2] ) {

        s = 2.0 * sqrt( 1.0 + m[1][1] - m[0][0] - m[2][2] );

        quat.w = ( m[0][2] - m[2][0] ) / s;
        quat.x = ( m[0][1] + m[1][0] ) / s;
        quat.y = 0.25 * s;
        quat.z = ( m[1][2] + m[2][1] ) / s;

    } else {

        s = 2.0 * sqrt( 1.0 + m[2][2] - m[0][0] - m[1][1] );

        quat.w = ( m[1][0] - m[0][1] ) / s;
        quat.x = ( m[0][2] + m[2][0] ) / s;
        quat.y = ( m[1][2] + m[2][1] ) / s;
        quat.z = 0.25 * s;

    }

    return quat;

}
