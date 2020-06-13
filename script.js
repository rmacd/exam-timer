let timerDTStart = null;
let timerDTEnd = null;
let timerDuration = null;
let rAF_ID = null;

$(document).ready(function () {

    $("#endTimePicker").datetimepicker({
        inline: true,
        sideBySide: true,
        stepping: 5,
        format: "HH:mm"
    });

    $("#endTimeModalSubmit").on('click', function () {
        var dttPicker = $('#endTimePicker');
        var endTimeDummy = $('#endTimeDummy');
        var endTimeEl = $('#endTime');

        if (getSeconds(dttPicker) < 1) {
            endTimeDummy.val(moment().add(1, 'minutes').format('HH:mm'));
            endTimeEl.val(moment().add(1, 'minutes').toISOString());
            dttPicker.data('DateTimePicker').date(endTimeDummy.val());
            return;
        }
        endTimeDummy.val(dttPicker.data('DateTimePicker').viewDate().format('HH:mm'));
        endTimeEl.val(dttPicker.data('DateTimePicker').viewDate().toISOString());
        endTimeDummy.removeClass('is-invalid');
    });

    // for tab-in
    $("#endTime").focus(function () {
        $("#endTimeModal").modal();
    });
    $('a[href$="#magic8Ball"]').on("click", function () {
        $('#magic8BallModal').modal('show');
    });

    function toggleTimerType() {
        if ($("#timer-type button.active").data('type') === "duration") {
            $('#item-duration').addClass('d-block d-md-flex').removeClass('d-none');
            $('#item-time').addClass('d-none').removeClass('d-block d-md-flex');
        } else {
            $('#item-duration').removeClass('d-block d-md-flex').addClass('d-none');
            $('#item-time').removeClass('d-none').addClass('d-block d-md-flex');
        }
    }

    $("#timer-type button").click(function () {
        $(this).addClass('active').siblings().removeClass('active');
        toggleTimerType();
    });

    $("#startTimer").click(function () {
        timerDTEnd = moment().add($("#mins").val(), 'minutes');
        runTimer();
    });

    $("#reset-timer").click(function () {
        clearInterval(rAF_ID);
        $("#row-timer").hide();
        $("#row-options").show();
    });

    // mogic 8 ball stuff
    var magic8Ball = {};
    magic8Ball.listofanswers = ["A? Maybe", "Think it's B", "C? Or maybe D?", "D? Maybe? No - E", "C. Pretty sure.", "Who knows?!"];
    magic8Ball.getAnswer = function (text) {
        var randomNumber = Math.random();
        var randomAnswer = Math.floor(randomNumber * this.listofanswers.length);
        var answer = this.listofanswers[randomAnswer];

        $("#eightBallImage").effect("shake");
        $("#eightBallAnswer")
            .text(answer)
            .fadeIn(3000);
        $("#eightBallImage").attr("src", "8BallAnswer.png");
    };

    $("#eightBallAnswer").hide();

    $("#magic8BallQuestion").click(function () {
        $("#eightBallAnswer").hide();
        $("#eightBallImage").attr("src", "8BallQuestion.png");
        magic8Ball.getAnswer("");
    });

});

function getSeconds(element) {
    return moment.duration($(element).data('DateTimePicker').viewDate().diff(moment())).asSeconds();
}

function runTimer() {
    var activeMode = $("#timer-type button.active");
    timerDTStart = moment();

    if (activeMode.data('type') === "duration") {
        // validate mins
        var mins = $("#mins");
        if (mins.val() === undefined || mins.val() === "" || mins.val() < 1 || mins.val() > 250) {
            mins.addClass('is-invalid');
            return;
        } else {
            mins.removeClass('is-invalid');
        }
        console.log(`setting end time to ${mins.val()} mins in the future`);
        timerDTEnd = moment().add(mins.val(), 'minutes');
    } else {
        if (activeMode.data('type') !== "time") {
            console.log("Something's gone wrong (active mode select): bombing out");
            return;
        }

        var timeDummy = $("#endTimeDummy");
        var timeElement = $("#endTime");

        // validate
        if (timeElement.val() === undefined || timeElement.val() === "") {
            timeDummy.addClass('is-invalid');
            return;
        } else {
            timeDummy.removeClass('is-invalid');
        }

        // check value is in the future
        var secs = getSeconds($("#endTimePicker"));
        if (secs < 1) {
            timeElement.addClass('is-invalid');
            return;
        } else {
            timeElement.removeClass('is-invalid');
        }
        timerDTEnd = moment(timeElement.val());
    }

    timerDuration = moment.duration(timerDTEnd.diff(timerDTStart));
    console.log(`start: ${timerDTStart.toISOString()} end: ${timerDTEnd.toISOString()} (${timerDuration.asSeconds()} sec)`)

    // validate questions
    var questions = $("#questions");
    if (questions.val() === undefined || questions.val() === "" || questions.val() < 1 || questions.val() > 250) {
        questions.addClass('is-invalid');
        return;
    } else {
        questions.removeClass('is-invalid');
    }

    // all good, now continue
    $(this).addClass('disabled');

    $("#timer-end-time").text(`End time set to: ${timerDTEnd.format('HH:mm:ss')}`);
    $("#timer-question-progress").text(`${questions.val()} questions in
            ${Math.floor(timerDuration.asMinutes()) + 1} mins: `);

    let count = 0;
    let tick = 0;
    let status = 3;
    let questionsComplete = 0;
    let percentComplete = 0;

    // set base classes
    $("#timer").removeClass().addClass('alert alert-dark');

    $("#row-timer").show();
    $("#progress-bar-parent").show();
    $("#row-options").hide();

    var rAFCallback = function () {
        count += 1;

        if (Math.floor(count / 2) > tick) {
            tick += 1;
            var durationToEnd = moment.duration(timerDTEnd.diff(moment()));
            var durationFromStart = moment.duration(moment().diff(timerDTStart));
            var percentComplete = durationFromStart.asSeconds() / timerDuration.asSeconds() * 100;
            var questionsComplete = Math.floor(questions.val() / 100 * percentComplete) + 1;

            if (durationToEnd.asSeconds() < 0 && status > 0) {
                $("#timer").removeClass().addClass('alert alert-info');
                $("#progress-bar-parent").hide();
                status = 0;
                clearInterval(rAF_ID);
                return;
            } else if (durationToEnd.asSeconds() < 60 && status > 1) {
                $("#timer").removeClass().addClass('alert alert-danger');
                status = 1;
            } else if (durationToEnd.asSeconds() < 300 && status > 2) {
                $("#timer").removeClass().addClass('alert alert-warning');
                status = 2;
            }

            // update fields
            /*
            <p id="timer-end-time" class="text-muted my-3"></p>
            <h4 id="timer-time-remaining" class="alert-heading"></h4>
            <p id="timer-question-progress" class="text-muted my-3"></p>
            */

            $("#timer-time-remaining").text(`Remaining: ${durationToEnd.hours()}h ${durationToEnd.minutes()}m ${durationToEnd.seconds()}s`)
            $("#timer-question-progress").text(`Should be on Q${questionsComplete} of ${questions.val()} (progress: ${Math.round(percentComplete)}%)`)
            $("#progress-bar").prop('aria-valuenow', Math.round(percentComplete)).css('width', `${percentComplete}%`);
        }
    };

    // request animation frame on render
    rAF_ID = setInterval(rAFCallback, 490);
}