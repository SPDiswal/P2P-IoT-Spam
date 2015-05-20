/// <reference path="typings/jquery/jquery.d.ts" />

$(() =>
{
    var host = "{{ selfAddr }}";

    function showTab(tabName: string)
    {
        $(".tab").hide();
        $(tabName).show();
    }

    function join()
    {
        $.post("http://" + host + "/join/" + $("#joinPort").val());
    }

    function publish()
    {
        var tagsContents = $("#publishTags").val();
        if (tagsContents === "") return;

        var tags = tagsContents.split(",");

        var contents = $("#publishContents").val().split("\n");
        var contentObject = { };

        contents.forEach((c: string) =>
        {
            var pair = c.split(":");

            if (pair.length > 1) contentObject[pair[0].trim()] = pair[1].trim();
            else contentObject[c.trim()] = "";
        });

        $.ajax({
            url: "http://" + host + "/publish",
            type: "POST",
            data: JSON.stringify({
                contents: contentObject,
                tags: tags
            }),
            contentType: "application/json",
            dataType: "json"
        });
    }

    function subscribe()
    {
        var tagsContents = $("#subscribeTags").val();
        if (tagsContents === "") return;

        var tags = tagsContents.split(",");

        var filterContents = $("#subscribeFilter").val();
        var filter = "(function (tags, contents) { return true; })";

        if (filterContents !== "")
            filter = "(function (tags, contents) { return " + filterContents + "; })";

        $.ajax({
            url: "http://" + host + "/subscribe",
            type: "POST",
            data: JSON.stringify({
                filter: filter,
                tags: tags,
                retrieveOldMessages: $("#subscribeRetrieveOld").prop("checked")
            }),
            contentType: "application/json",
            dataType: "json"
        });
    }

    function unsubscribe()
    {
        $.post("http://" + host + "/unsubscribe/" + $("#unsubscribeId").val());
    }

    $("#joinTab").click(() => showTab("#join"));
    $("#publishTab").click(() => showTab("#publish"));
    $("#subscribeTab").click(() => showTab("#subscribe"));
    $("#unsubscribeTab").click(() => showTab("#unsubscribe"));

    $("#joinPortButton").click(join);
    $("#publishButton").click(publish);
    $("#subscribeButton").click(subscribe);
    $("#unsubscribeButton").click(unsubscribe);
    $("#clearMessages").click(() => $("#messageContents").empty());

    setInterval(() =>
    {
        $.get("http://" + host + "/messages", (data: any) =>
        {
            data.forEach((s: string) =>
            {
                var $messageContents = $("#messageContents");
                $messageContents.append(s + "\n");
                if ($messageContents.length) $messageContents.scrollTop($messageContents[0].scrollHeight - $messageContents.height());
            });
        });
    }, 100);

    (<any>$(".tags")).tagsInput({
        width: "98%",
        height: "28px",
        defaultText: "Tags",
        delimiter: [ "," ],
        removeWithBackspace: true
    });

    (<any>$(".tags")).importTags("");
});