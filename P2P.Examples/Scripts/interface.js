(function ()
{
    function hash(value)
    {
        return parseInt("0x" + CryptoJS.SHA1(value).toString().slice(0, 8));
    }

    var canvasMargin = { top: 20, right: 20, bottom: 30, left: 50 };
    var canvasWidth = 1200 - canvasMargin.left - canvasMargin.right;
    var canvasHeight = 500 - canvasMargin.top - canvasMargin.bottom;

    var parseDate = d3.time.format("%Y-%m-%d %X").parse;

    var x = d3.time.scale().range([ 0, canvasWidth ]);
    var y = d3.scale.linear().range([ canvasHeight, 0 ]);

    var xAxis = d3.svg.axis().scale(x).orient("bottom").tickFormat(d3.time.format("%H:%M"));
    var yAxis = d3.svg.axis().scale(y).orient("left");

    var line = d3.svg.line()
        .x(function (d) { return x(parseDate(d.Timestamp)); })
        .y(function (d) { return y(isNaN(parseFloat(d.Value)) ? 0.0 : parseFloat(d.Value)); });

    var selfHash = hash("{{ selfAddr }}");

    function clearCanvas()
    {
        $("#visualisation").empty();

        return d3.select("#visualisation").append("svg")
            .attr("width", canvasWidth + canvasMargin.left + canvasMargin.right)
            .attr("height", canvasHeight + canvasMargin.top + canvasMargin.bottom)
            .append("g")
            .attr("transform", "translate(" + canvasMargin.left + "," + canvasMargin.top + ")");
    }

    function visualise()
    {
        var value = $("#lookup").val();

        if (value !== "")
        {
            $.get("http://{{ selfAddr }}/spamble/resource/" + value, function (data)
            {
                if (data.length > 0)
                {
                    var svg = clearCanvas();

                    $("#fingers").hide();
                    $("#successors").hide();
                    $("#resources").hide();
                    $("#replications").hide();
                    $("#visualisation").show();

                    x.domain(d3.extent(data, function (d)
                    {
                        return parseDate(d.Timestamp);
                    }));
                    y.domain(d3.extent(data, function (d)
                    {
                        return isNaN(parseFloat(d.Value)) ? 0.0 : parseFloat(d.Value);
                    }));

                    svg.append("g")
                        .attr("class", "x axis")
                        .attr("transform", "translate(0," + canvasHeight + ")")
                        .call(xAxis);

                    svg.append("g")
                        .attr("class", "y axis")
                        .call(yAxis)
                        .append("text")
                        .attr("transform", "rotate(-90)")
                        .attr("y", 6)
                        .attr("dy", ".71em")
                        .style("text-anchor", "end")
                        .text(value);

                    svg.append("path")
                        .datum(data)
                        .attr("class", "line")
                        .attr("d", line);

                    var latestData = data.pop();
                    $("#lookupResultLeft").html("<i>" + latestData.Timestamp.split(" ")[1] + "</i>");
                    $("#lookupResultRight").html("<b>" + latestData.Value + "</b>");
                }
                else
                {
                    $("#lookupResultLeft").html("<b>" + value + "</b> does not exist or has no data.");
                    $("#lookupResultRight").empty();
                }
            });
        }
    }

    function appendRow(element, firstCol, secondCol, thirdCol, first, second, third)
    {
        $(element).append($("<div class=\"row\">")
            .append($("<div class=\"col-lg-" + firstCol + "\">").html(first))
            .append($("<div class=\"col-lg-" + secondCol + "\">").html(second))
            .append($("<div class=\"col-lg-" + thirdCol + "\">").html(third)));
    }

    function updatePredecessor()
    {
        $.get("http://{{ selfAddr }}/spamble/predecessor", function (data)
        {
            if (data.peer != null)
            {
                $("#predecessorAddress").html("<a href=\"http://" + data.peer + "\">" + data.peer + "</a>");
                $("#predecessorHash").text(hash(data.peer));
                $("#predecessorChevron").html("<a href=\"http://" + data.peer + "\"><span class=\"glyphicon glyphicon-chevron-left\"></span></a>");
            }
            else
            {
                $("#predecessorAddress").html("<i>None</i>");
                $("#predecessorHash").empty();
                $("#predecessorChevron").html("<span class=\"glyphicon glyphicon-chevron-left\"></span>");
            }
        });
    }

    function updateSuccessor()
    {
        $.get("http://{{ selfAddr }}/spamble/successor", function (data)
        {
            $("#successorAddress").html("<a href=\"http://" + data.peer + "\">" + data.peer + "</a>");
            $("#successorHash").text(hash(data.peer));
            $("#successorChevron").html("<a href=\"http://" + data.peer + "\"><span class=\"glyphicon glyphicon-chevron-right\"></span></a>");
        });
    }

    function updateFingers()
    {
        $.get("http://{{ selfAddr }}/spamble/fingers", function (data)
        {
            $("#fingerFixed").html("Most recently fixed finger: " + data.mostRecentlyFixedFinger);
            $("#successorFixed").html("Most recently fixed successor: " + data.mostRecentlyFixedSuccessor);

            var fingers = data.fingers;
            var successors = data.successors;

            $("#fingerList").empty();
            $("#successorList").empty();

            for (var i = 0; i < fingers.length; i++)
                appendRow("#fingerList", 1, 1, 3, i, (selfHash + Math.pow(2, i)) % Math.pow(2, fingers.length), "<a href=\"http://" + fingers[i].address + "\">" + fingers[i].address + "</a> (hash: " + fingers[i].id + ")");

            for (i = 0; i < successors.length; i++)
                appendRow("#successorList", 1, 1, 3, i, "", "<a href=\"http://" + successors[i].address + "\">" + successors[i].address + "</a> (hash: " + successors[i].id + ")");
        });
    }

    function updateResources()
    {
        $.get("http://{{ selfAddr }}/spamble/resources", function (data)
        {
            var resources = data.resources;

            $("#resourceList").empty();

            if (resources.length === 0)
                $("#resourceList").html("<i>None</i>");
            else
            {
                for (var i = 0; i < resources.length; i++)
                {
                    (function (j)
                    {
                        appendRow("#resourceList", 2, 1, 6, "<a id=\"resource" + resources[j].name + "\">" + resources[j].name + "</a>", resources[j].id, "<a href=\"" + resources[j].url + "\">" + resources[j].url + "</a>");
                        $("#resource" + resources[j].name).on("click", function ()
                        {
                            $("#lookup").val(resources[j].name);
                            visualise();
                        });
                        $("#resource" + resources[j].name).css("cursor", "pointer");
                    })(i);
                }
            }
        });

        $.get("http://{{ selfAddr }}/spamble/replications", function (data)
        {
            var replications = data.replications;

            $("#replicationList").empty();

            if (replications.length === 0)
                $("#replicationList").html("<i>None</i>");
            else
            {
                for (var i = 0; i < replications.length; i++)
                {
                    (function (j)
                    {
                        appendRow("#replicationList", 2, 1, 6, "<a id=\"replication" + replications[j].name + "\">" + replications[j].name + "</a>", replications[j].id, "<a href=\"" + replications[j].url + "\">" + replications[j].url + "</a>");
                        $("#replication" + replications[j].name).on("click", function ()
                        {
                            $("#lookup").val(replications[j].name);
                            visualise();
                        });
                        $("#replication" + replications[j].name).css("cursor", "pointer");
                    })(i);
                }
            }
        });
    }

    function updateAll()
    {
        updatePredecessor();
        updateSuccessor();
        updateFingers();
        updateResources();
    }

    function update()
    {
        updatePredecessor();
        updateSuccessor();

        if ($("#fingers").is(":visible"))
            updateFingers();

        if ($("#resources").is(":visible"))
            updateResources();
    }

    function join()
    {
        $("#joinPort").hide();
        $("#joinButton").hide();
        $.post("http://{{ selfAddr }}/spamble/join/127.0.0.1:" + $("#joinPort").val());
        setTimeout(updateAll, 3500);
    }

    function leave()
    {
        $.post("http://{{ selfAddr }}/spamble/leave");
        setTimeout(updateAll, 500);
    }

    function addResource()
    {
        var name = $("#addResourceName").val();
        var url = $("#addResourceUrl").val();
        var primary = $("#addResourcePrimary").val();

        if (name !== "" && url !== "")
        {
            var primaryPath = primary === "" ? [ ] : primary.split(",");

            var data = JSON.stringify({
                name: name,
                url: url,
                primary: primaryPath
            });

            $.ajax({
                url: "http://{{ selfAddr }}/spamble/resource",
                type: "PUT",
                data: data,
                contentType: "application/json"
            });

            $("#addResource").hide();
            $("#addResourceToggleButton").html("<span class=\"glyphicon glyphicon-plus\"></span>");
            $("#addResourceToggleButton").attr("title", "Add resource").tooltip("fixTitle");
        }
    }

    $(function ()
    {
        $("#lookup").on("input", function ()
        {
            var value = $("#lookup").val();

            if (value !== "")
            {
                $.get("http://{{ selfAddr }}/spamble/lookup/" + hash(value), function (data)
                {
                    $("#lookupResultLeft").html(hash(value));
                    $("#lookupResultRight").html("<a href=\"http://" + data.peer + "\">" + data.peer + "</a> (hash: " + hash(data.peer) + ")");
                });
            }
            else
            {
                $("#lookupResultLeft").html("<i>Type to spam...</i>");
                $("#lookupResultRight").empty();
            }
        });

        $("#addResourceName").on("input", function ()
        {
            var value = $("#addResourceName").val();

            if (value !== "")
            {
                $.get("http://{{ selfAddr }}/spamble/lookup/" + hash(value), function (data)
                {
                    $("#addResourceId").html(hash(value) + " in " + data.peer);
                });
            }
            else
                $("#addResourceId").empty();
        });

        $("#joinToggleButton").on("click", function ()
        {
            $("#joinPort").toggle();
            $("#joinButton").toggle();

            if ($("#joinPort").is(":visible"))
                $("#joinPort").focus();
        });

        $("#joinButton").on("click", join);

        $("#leaveButton").on("click", leave);

        $("#searchButton").on("click", visualise);

        $("#fingerToggleButton").on("click", function ()
        {
            $("#visualisation").hide();
            $("#resources").hide();
            $("#replications").hide();

            if ($("#fingers").is(":visible"))
            {
                $("#fingers").hide();
                $("#successors").hide();
            }
            else
            {
                $("#fingers").show();
                $("#successors").show();
            }
        });

        $("#resourceToggleButton").on("click", function ()
        {
            $("#visualisation").hide();
            $("#fingers").hide();
            $("#successors").hide();

            if ($("#resources").is(":visible"))
            {
                $("#resources").hide();
                $("#replications").hide();
            }
            else
            {
                $("#resources").show();
                $("#replications").show();
            }
        });

        $("#addResourceToggleButton").on("click", function ()
        {
            $("#addResource").toggle();

            if ($("#addResource").is(":visible"))
            {
                $("#addResourceToggleButton").html("<span class=\"glyphicon glyphicon-remove\"></span>");
                $("#addResourceToggleButton").attr("title", "Cancel").tooltip("fixTitle").tooltip("show");;
            }
            else
            {
                $("#addResourceToggleButton").html("<span class=\"glyphicon glyphicon-plus\"></span>");
                $("#addResourceToggleButton").attr("title", "Add resource").tooltip("fixTitle").tooltip("show");;
            }
        });

        $("#addResourceButton").on("click", addResource);

        $("#lookup").on("keydown", function (e)
        {
            if (e.keyCode === 13)
                visualise();
        });

        $("#joinPort").on("keydown", function (e)
        {
            if (e.keyCode === 13)
                join();
        });

        $("#addResourceName").on("keydown", function (e)
        {
            if (e.keyCode === 13)
                addResource();
        });

        $("#addResourceUrl").on("keydown", function (e)
        {
            if (e.keyCode === 13)
                addResource();
        });

        $("#addResourcePrimary").on("keydown", function (e)
        {
            if (e.keyCode === 13)
                addResource();
        });

        $("#selfHash").text(selfHash);

        updateAll();
        setInterval(update, 1000);
        setInterval(function ()
        {
            if ($("#visualisation").is(":visible"))
                visualise();
        }, 60000);

        var margin = { top: 20, right: 20, bottom: 30, left: 50 };
        var width = 960 - margin.left - margin.right;
        var height = 500 - margin.top - margin.bottom;

        clearCanvas(margin, width, height);

        $("[data-toggle='tooltip']").tooltip();
        $("#lookup").val("");
        $("#lookup").focus();
    });
})();