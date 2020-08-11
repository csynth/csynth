    // canvas.onwheel = (e) => {
    //     mesh.scale.multiplyScalar(1 + e.deltaY*wheelspeed);
    // }
    // canvas.onmousemove = (e) => {
    //     const w = e.buttons;
    //     if (w) {
    //         if (laste.buttons === w) {
    //             const dx = e.clientX - laste.clientX;
    //             const dy = -e.clientY + laste.clientY;
    //             switch(w) {
    //                 case 1:
    //                     mesh.rotateOnWorldAxis(xax, -dy*rotspeed);
    //                     mesh.rotateOnWorldAxis(yax, dx*rotspeed);
    //                     break;
    //                 case 3:
    //                     mesh.rotateOnWorldAxis(zax, -(dx+dy)*rotspeed);
    //                     break;
    //                 case 4:
    //                     mesh.scale.multiplyScalar(1 + (dx+dy)*rotspeed);
    //                     break;
    //                 case 2:
    //                     mesh.position.x += dx*rotspeed;
    //                     mesh.position.y += dy*rotspeed;
    //                     break;
    //             }
    //         }
    //         laste = e;
    //     } else {
    //         laste = {};
    //     }
    // }
