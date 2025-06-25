pragma circom 2.0.1;

template Main() {
    signal input right_leaf[256]; //private
    signal input left_leaf[256];
    signal output concat[512];

    for (var i = 0; i < 256; i++) {
        concat[i] <== left_leaf[i];
        concat[i + 256] <== right_leaf[i];
    }
}

component main = Main();
