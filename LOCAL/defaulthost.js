/*
 * LOCAL scripts can change the behaviour based on hostname.
 * hostname is not known outside node webkit version, and this LOCAL/defaulthost.js file will be called
 *
 * The file may carry out immediate actions, or defined hoststartEarly() and hoststartLate() functions
 * that will be called later in the initialization cycle.
 */
//alert("on default host, host name not known");
var hostname;
hostname = hostname+""; // so the file gets seen in debugger

