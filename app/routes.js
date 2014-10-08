// ROUTES

var creds       = require('../config/app.js'),
    mongoose    = require('mongoose'),
    db          = require('../config/database.js');

//expose these routes to our app
module.exports = function(app, port, QuickBooks, request, qs, express){

// Connect to QB online API
// 1. Define the route for initiating the connection
// 2. Upon successful authorization, get the token and the token secret, close the Auth window
// 3. Callback route. Supply consumer key, consumer secret, token, token secret and initiate the QB object
// 4. Now you have access to the QB object, so call the endpoints and profit.

app.get('/start', function(req, res) {
  res.render('intuit.ejs', {locals: {port:port}})
})

app.get('/requestToken', function(req, res) {
  var postBody = {
    url: QuickBooks.REQUEST_TOKEN_URL,
    oauth: {
      callback:        'http://localhost:' + port + '/callback/',
      consumer_key:    creds.consumerKey,
      consumer_secret: creds.consumerSecret
    }
  }
  request.post(postBody, function (e, r, data) {
    var requestToken = qs.parse(data)
    req.session.oauth_token_secret = requestToken.oauth_token_secret
    console.log(requestToken)
    res.redirect(QuickBooks.APP_CENTER_URL + requestToken.oauth_token)
  })
})

// based on successful or unsucessful auth, take appropriate action
app.get('/callback', function(req, res) {
  var postBody = {
    url: QuickBooks.ACCESS_TOKEN_URL,
    oauth: {
      consumer_key:    creds.consumerKey,
      consumer_secret: creds.consumerSecret,
      token:           req.query.oauth_token,
      token_secret:    req.session.oauth_token_secret,
      verifier:        req.query.oauth_verifier,
      realmId:         req.query.realmId
    }
  }
  request.post(postBody,  function (e, r, data) {
    var accessToken = qs.parse(data)
    console.log(accessToken)
    console.log(postBody.oauth.realmId)

    // save the access token somewhere on behalf of the logged in user
    qbo = new QuickBooks(creds.consumerKey,
                         creds.consumerSecret,
                         accessToken.oauth_token,
                         accessToken.oauth_token_secret,
                         postBody.oauth.realmId,
                         true); // turn debugging on

    // test out account access
    /*qbo.findAccounts(function(_, accounts) {
      accounts.QueryResponse.Account.forEach(function(account) {
        console.log(account.Name)
      })
    })*/

    res.send('<html><body><script>window.close()</script>')

})


// to save the api response to mongo
app.get('/vbdetail/write', express.bodyParser(), function(req,res){

  //make the api call
  qbo.reportVendorBalanceDetail({date_macro:'This Month-to-date', appaid: 'Unpaid'},function(_,report){

    // database connection
    var findb = mongoose.connect(db.url);
    // and save the JSON as a collection
    console.log(findb)
    //findb.collection.save(report);


  })




})



app.get('/vendorbalancedetail', express.bodyParser(), function(req, res){
    qbo.reportVendorBalanceDetail({date_macro:'This Month-to-date', appaid: 'Unpaid'},function(_,report){

      //console.log(report)
    res.render('vendorbalancedetail.jade', {title: "Report Detail",
                              reportname: report["Header"]['ReportName'],
                              daterange: "From:"+report["Header"]["StartPeriod"]+" to: "+report["Header"]["EndPeriod"],
                              alldata: report,
                              columns: report["Columns"],
                              rowsperclient: report["Rows"]
                            });
      })

    })

app.get('/profitandlossdetail', express.bodyParser(), function(req,res){
    qbo.reportProfitAndLossDetail({date_macro:'This Month-to-date',
                                   sort_order: 'descend',
                                   account_type: 'Bank'}, function(_, report){
    console.log(report);
    res.render('profitandlossdetail.jade', {
        title: "Profit and Loss Detail",
        reportname: report["Header"]["ReportName"],
        daterange: "From: "+ report["Header"]["StartPeriod"]+ " to: "+ report["Header"]["EndPeriod"],
        columns: report["Columns"],
        rows: report["Rows"]
    })

    })

   })

})






}
