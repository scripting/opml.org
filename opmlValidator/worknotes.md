#### 6/8/24; 10:14:10 AM by DW

When I moved it to an HTTPS server, I didn't update the includes to also use HTTPS.

#### 4/15/24; 10:35:05 AM by DW

We were flagging legal uses of & and < as errors. No longer doing that. 

Thanks for the <a href="https://github.com/scripting/opml.org/issues/17">report</a>. 

#### 4/13/23; 10:27:18 AM by DW

When checking the version of a node of type "outline", we had the check for the existence of the version attribute wrong, it should've been !== instead of ===.

#### 8/19/21; 4:59:20 PM by DW

It used to save the validator at /dev.opml.org/validator/

