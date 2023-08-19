/*
.                                "Election Voting System with Date Time-based Controls"
In this project we are going to make a vote system allows user to cast a vote under a time.
This project will be for deployed production environment and this will not work in local production environment
bcz in local production environment dates on server are treated in UTC's and on browser are in  local time zone 
but the case is different when deployed on vercel bcz vercel treats dates in UTC's. 

So the election over date time limit rendered on home route is in UTC formet which does not meet to our conditions 
bcz we want to show the  election  over date time in user regional time and date.
For local production environment go to D/Node js tuotorials thapp/express/Date  

This project is hosted on  vercel you can check by using this link https://date-project.vercel.app/
*/
var express=require("express");
var requests=require("requests");
var app=express();

//Middleware which will be called on every request and serve the static files.
app.use(express.static(__dirname+"/public"));

//set the templating engine 
app.set('view engine','twig');
app.set('views','./public');

// express.json() is a middleware function that parses JSON payload, if any, in the incoming API requests
app.use(express.json());
app.use(express.urlencoded({extended:false}));


// Requiring the packages Mongoose.
var mongoose=require("mongoose");
//                                              Remote DB connection.
mongoose.connect("mongodb+srv://anas:anas123@cluster0.59qwvlj.mongodb.net/test?retryWrites=true&w=majority", { useCreateIndex: true, useNewUrlParser: true, useUnifiedTopology: true })
    .then(function () {
        console.log("connection succeed");
    })
    .catch(function (err) {
    if(err.code=="ECONNREFUSED"){
        console.log("not internet");
    }
    console.log("err happends");
});


var election_datetimeschema=mongoose.Schema({
    election_over_datetime:Date,
    country_name:String,
});

var election_datetimemodel=mongoose.model("electionsdatetime",election_datetimeschema);


/* Basically home route will shows the file home.twig for casting a vote when time is remained for casting  a vote
else it shows the message not allow to cast a vote bcz time date has passed.*/
app.get("/",function(req,res){
    election_datetimemodel.find({},function(err,result){
        if(err){
            console.log(err);
        }else if(result.length!=0){
            // current utc date and time
            var utcdatetime=new Date();
            // Getting and convert the into the utc election over date time for matching purpose.
            var a=new Date(result[0].election_over_datetime);
            if(a.getTime() > utcdatetime.getTime() || a.getTime()==utcdatetime.getTime()){
                // This will render the UTC time according to the browser time zone.
                var country_name=result[0].country_name;
                res.status(200).render("home",{datetime:a,country_name:country_name.toUpperCase()});
            }else{
                res.status(400).send("<br><br><br><br>"+
                    "<h2 style='text-align:center'>"+
                        "The polling time is over....please be patience for the next time."+
                    "</h2>"+
                    "<p style='text-align: center;color: green;font-size: 20px;'>"+
                        "Election Comission of Pakistan ECP"+
                    "</p>"
                );
            }
        }else{
            res.send("Not election happening now,Hit Admin Request for setting an election date time limit");
        }
    });
});
// From this route user is able to cast a vote under the election date time limit.
app.post("/vote",function(req,res){
    // Getting the current UTC date time when a user is casting a vote.
    var utcdatetime=new Date();
    //Getting the Fixed election over date time from the database in utc
    election_datetimemodel.find({},function(err,result){
        if(err){
            console.log(err);
        }else{
            // Getting an election over datetime 
            var a=new Date(result[0].election_over_datetime);
            if(a.getTime() > utcdatetime.getTime() || a.getTime()==utcdatetime.getTime()){
                res.status(200).send("<h2>ok you cast a vote under the time, thanks</h2>");
            }else{
                res.status(400).send("<h2>The polling time is over....please be patience for the next time.</h2>");
            }
        }
    });
});


// This route will alow the admin to set an election date time limit.
app.get("/admin",function(req,res){
    // This request will fetch the all countries time zone and render on the front end.s
    var get_timezones=requests("http://api.timezonedb.com/v2.1/list-time-zone?key=OARQKKSIOXBL&format=json");
    get_timezones.on('data', function (timezones) {
        var data=JSON.parse(timezones);
        // res.json(data);
        res.status(200).render("admin",{data:data.zones});
    });
    get_timezones.on('end', function (err) {
        if (err) return console.log('connection closed due to errors', err); 
        console.log('end');
        // res.end();
    });

});


app.post("/save_electiondatetime",function(req,res){
    /* Here below we conver the election over limit date time into the UTC formet due to vercel saved
    it in the same way getting from the front-end means vercel was saving this in local time*/
    var a=new Date(req.body.datetimepicker);
    /* The below will give us directly timezoneoffset in milieseconds from the front-end request through requestsAPI
    that why we dont use the below way.*/
    var request_data=req.body.rqstdata;
    var getting_data=request_data.split(",");
    var timezoneOffset=getting_data[0];
    var country_name=getting_data[1];
    var parse_timezonevalue=parseInt(timezoneOffset)*1000;
    /*                  converting timezone offset first into hours then into miliseconds.It's work when 
    you got the timezoneoffset value in this formet like -300,-350 or 100 etc.
    const hoursDifference = timezoneOffset / 60;
    const offsetAheadOfUTC = -hoursDifference;
    // Calculate the offset in milliseconds
    const offsetInMilliseconds = offsetAheadOfUTC * 60 * 60 * 1000;
    
    When we got the timezoneoffset in positive values the below if works which means - the values bcz + value means
    date is ahead of UTC so to convert into the UTC we have to subtract.
    */
    if(parse_timezonevalue>0){
        // Local timezone is ahead of the UTC so subtract the hours to the utc current time.
        var tt=a.getTime()-parse_timezonevalue;
        var first=new election_datetimemodel({election_over_datetime:new Date(tt),country_name:country_name});
        first.save(function(err,result){
            if(err){
                console.log(err);
            }else{
                res.send("successfully saved");
            }
        });
        /*When we got the timezoneoffset as a 0 which means the countries with UTC+0 and in this case local time
        and utc time is same that why we just saved the local time not convert the timedate in this case.*/
    }else if(parse_timezonevalue==0){
        var first=new election_datetimemodel({election_over_datetime:new Date(a),country_name:country_name});
        first.save(function(err,result){
            if(err){
                console.log(err);
            }else{
                res.send("successfully saved");
            }
        });
    }else{
        /* When timezone is like -10800 Argentina time zone Then we need to convert it first into positive value
        and - value means this dates is behind to the utc so we add this local time into the utc.*/
        var cnvrt_offsetAheadOfUTC = -(parse_timezonevalue);
        // Local timezone is behind the UTC so add the hours to utc current time.
        var tt=a.getTime()+cnvrt_offsetAheadOfUTC;
        var first=new election_datetimemodel({election_over_datetime:new Date(tt),country_name:country_name});
        first.save(function(err,result){
            if(err){
                console.log(err);
            }else{
                res.send("successfully saved");
            }
        });
    }
});


app.listen(process.env.PORT||3000);