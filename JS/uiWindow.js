var parentWindow;
var domain = window.location.origin;
var isProjected = false;

function MessageHandler( event )
{
        isProjected = true;
        var func = event.data['func'];
        var arg = event.data['arg'];

        console.log(func);
        console.log(arg);
        //func.apply(0, arg);

}

window.addEventListener("message", MessageHandler, false);
