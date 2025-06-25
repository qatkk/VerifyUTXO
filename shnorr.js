        let privKey;
        do {
            privKey = crypto.randomBytes(32);
        } while (!secp256k1.privateKeyVerify(privKey));
        let public_key_point = Point.BASE.multiply(bufferToBigInt(privKey));
        //////////// random point 
        do {
            random = crypto.randomBytes(32);
        } while (!secp256k1.privateKeyVerify(random));        
        let random_point = Point.BASE.multiply(bufferToBigInt(random));
        ///////////////// message 
        let message = crypto.randomBytes(32);
        //////////////// e for the signature
        let input = Buffer.concat([random_point.toRawBytes().slice(1,33),
        public_key_point.toRawBytes().slice(1, 33),
        message]);

        let hash = crypto.createHash("sha256")
            .update(input)
            .digest("hex");
        hash = bufferToBigInt(Buffer.from(hash, 'hex')) % CURVE.n;

        const signature = (bufferToBigInt(random) + hash * bufferToBigInt(privKey)) % CURVE.n;

        // ////////// signature verification : 
        const lef_hand_side = Point.BASE.multiply(signature); 
        const right_hand_side = random_point.add(public_key_point.multiply(hash));
        assert.equal(lef_hand_side.equals(right_hand_side), true);